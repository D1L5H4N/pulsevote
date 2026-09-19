// Package websocket implements the real-time WebSocket hub backed by Redis Pub/Sub.
//
// Architecture:
//
//	Hub manages "rooms" - one room per poll ID.
//	Each room maintains a set of connected WebSocket clients.
//	When the first client joins a room, a goroutine subscribes to the Redis
//	Pub/Sub channel for that poll. All subsequent clients in the same room
//	share the same Redis subscription. When the last client leaves, the
//	subscription is cleaned up.
//
//	Vote flow:
//	  vote.Service → redis.Publish(poll:X) → Room goroutine receives → broadcast to all clients
package websocket

import (
	"context"
	"log"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	goredis "github.com/redis/go-redis/v9"

	redisutil "github.com/pulsevote/backend/internal/redis"
)

const (
	// Time allowed to write a message to the client.
	writeWait = 10 * time.Second
	// Time allowed to read the next pong from the client.
	pongWait = 60 * time.Second
	// Send pings at this interval (must be less than pongWait).
	pingPeriod = (pongWait * 9) / 10
	// Maximum message size allowed from client.
	maxMessageSize = 512
)

// Client represents a single connected WebSocket consumer.
type Client struct {
	conn   *websocket.Conn
	send   chan []byte // buffered channel of outbound messages
	pollID string
	hub    *Hub
}

// Room represents one poll's WebSocket room.
// It holds all connected clients and manages the Redis subscription lifecycle.
type Room struct {
	clients map[*Client]bool
	pubsub  *goredis.PubSub
	cancel  context.CancelFunc
}

// Hub is the central coordinator for all WebSocket rooms.
// It is safe for concurrent use; all mutations go through the register/unregister channels.
type Hub struct {
	mu          sync.RWMutex
	rooms       map[string]*Room
	register    chan *Client
	unregister  chan *Client
	redisClient *goredis.Client
}

// NewHub creates a Hub and starts its event loop goroutine.
func NewHub(redisClient *goredis.Client) *Hub {
	h := &Hub{
		rooms:       make(map[string]*Room),
		register:    make(chan *Client, 64),
		unregister:  make(chan *Client, 64),
		redisClient: redisClient,
	}
	go h.run()
	return h
}

// run is the Hub's event loop. It serializes register/unregister events
// to avoid races on the rooms map.
func (h *Hub) run() {
	for {
		select {
		case client := <-h.register:
			h.addClient(client)
		case client := <-h.unregister:
			h.removeClient(client)
		}
	}
}

// addClient adds a client to its poll room, creating the room if it doesn't exist.
func (h *Hub) addClient(client *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()

	room, exists := h.rooms[client.pollID]
	if !exists {
		// First client in this poll room - start a Redis subscription goroutine
		ctx, cancel := context.WithCancel(context.Background())
		pubsub := redisutil.Subscribe(ctx, h.redisClient, client.pollID)

		room = &Room{
			clients: make(map[*Client]bool),
			pubsub:  pubsub,
			cancel:  cancel,
		}
		h.rooms[client.pollID] = room

		// One goroutine per poll room reads from Redis and broadcasts to all clients
		go h.listenAndBroadcast(client.pollID, room)
		log.Printf("[ws] room created for poll %s", client.pollID)
	}

	room.clients[client] = true
	viewerCount := int64(len(room.clients))
	log.Printf("[ws] client joined poll %s (total: %d)", client.pollID, viewerCount)

	// Update Redis presence counter and broadcast instantly
	go func(pollID string, count int64) {
		ctx := context.Background()
		_ = h.redisClient.Set(ctx, redisutil.PresenceKey(pollID), count, 24*time.Hour).Err()
		h.broadcastPresence(pollID, count)
	}(client.pollID, viewerCount)
}

// removeClient removes a client from its room and tears down the room
// (including the Redis subscription) if no clients remain.
func (h *Hub) removeClient(client *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()

	room, exists := h.rooms[client.pollID]
	if !exists {
		return
	}

	if _, ok := room.clients[client]; ok {
		delete(room.clients, client)
		close(client.send)
	}

	remaining := int64(len(room.clients))
	if remaining == 0 {
		// Last client left - cancel the Redis subscription and clean up
		room.cancel()
		room.pubsub.Close()
		delete(h.rooms, client.pollID)
		log.Printf("[ws] room closed for poll %s (no clients remaining)", client.pollID)

		// Clear Redis presence
		go func(pollID string) {
			_ = h.redisClient.Del(context.Background(), redisutil.PresenceKey(pollID)).Err()
		}(client.pollID)
	} else {
		// Update Redis presence counter and broadcast new count
		go func(pollID string, count int64) {
			ctx := context.Background()
			_ = h.redisClient.Set(ctx, redisutil.PresenceKey(pollID), count, 24*time.Hour).Err()
			h.broadcastPresence(pollID, count)
		}(client.pollID, remaining)
	}
}

// broadcastPresence publishes real-time audience presence over the poll's channel.
func (h *Hub) broadcastPresence(pollID string, viewers int64) {
	if h.redisClient == nil {
		return
	}
	payload := map[string]interface{}{
		"type":          "presence",
		"poll_id":       pollID,
		"total_viewers": viewers,
	}
	_ = redisutil.Publish(context.Background(), h.redisClient, pollID, payload)
}

// listenAndBroadcast reads messages from the Redis Pub/Sub channel for a poll
// and broadcasts them to all connected clients in that room.
//
// This goroutine lives for the lifetime of a room (first client join → last client leave).
func (h *Hub) listenAndBroadcast(pollID string, room *Room) {
	ch := room.pubsub.Channel()
	for msg := range ch {
		payload := []byte(msg.Payload)

		h.mu.RLock()
		for client := range room.clients {
			select {
			case client.send <- payload:
			default:
				// Client send buffer is full - they are likely disconnected.
				// We do not close here; the unregister channel handles cleanup.
				log.Printf("[ws] client send buffer full for poll %s - dropping message", pollID)
			}
		}
		h.mu.RUnlock()
	}
	log.Printf("[ws] Redis subscription goroutine exiting for poll %s", pollID)
}

// Register sends a client registration event to the hub's event loop.
func (h *Hub) Register(client *Client) {
	h.register <- client
}

// Unregister sends a client unregistration event to the hub's event loop.
func (h *Hub) Unregister(client *Client) {
	h.unregister <- client
}

// writePump pumps messages from the client's send channel to the WebSocket connection.
// It also sends periodic pings to detect dead connections.
func (c *Client) writePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.send:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				// Hub closed the channel - send a close frame
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			if err := c.conn.WriteMessage(websocket.TextMessage, message); err != nil {
				return
			}

		case <-ticker.C:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

// readPump reads from the WebSocket connection to handle pongs and detect disconnects.
// We don't expect clients to send data over the WebSocket; this loop only serves
// to keep the connection alive via the pong handler.
func (c *Client) readPump() {
	defer func() {
		c.hub.Unregister(c)
		c.conn.Close()
	}()

	c.conn.SetReadLimit(maxMessageSize)
	c.conn.SetReadDeadline(time.Now().Add(pongWait))
	c.conn.SetPongHandler(func(string) error {
		c.conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})

	for {
		// We discard any incoming messages - the WebSocket is server-push only.
		if _, _, err := c.conn.ReadMessage(); err != nil {
			break
		}
	}
}
