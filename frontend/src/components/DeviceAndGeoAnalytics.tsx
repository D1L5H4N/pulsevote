import { Smartphone, Monitor, Tablet, Globe, MapPin } from 'lucide-react'
import { DeviceBreakdown, GeoItem } from '../services/api'

interface DeviceAndGeoAnalyticsProps {
  devices: DeviceBreakdown
  geography: GeoItem[]
}

export default function DeviceAndGeoAnalytics({ devices, geography }: DeviceAndGeoAnalyticsProps) {
  const deviceItems = [
    {
      name: 'Mobile',
      icon: <Smartphone size={15} className="text-violet-400" />,
      count: devices.mobile,
      pct: devices.mobile_pct,
      color: 'bg-violet-500',
    },
    {
      name: 'Desktop',
      icon: <Monitor size={15} className="text-indigo-400" />,
      count: devices.desktop,
      pct: devices.desktop_pct,
      color: 'bg-indigo-500',
    },
    {
      name: 'Tablet',
      icon: <Tablet size={15} className="text-cyan-400" />,
      count: devices.tablet,
      pct: devices.tablet_pct,
      color: 'bg-cyan-500',
    },
  ]

  const totalVotes = geography.reduce((acc, curr) => acc + curr.votes, 0)

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
      {/* Device Breakdown */}
      <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-6 backdrop-blur-sm h-full min-h-[380px] flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-violet-500/15 flex items-center justify-center text-violet-400 shrink-0">
                <Smartphone size={16} />
              </div>
              <div>
                <h3 className="font-semibold text-white text-sm tracking-tight">Device Distribution</h3>
                <p className="text-xs text-slate-400">Breakdown of voter clients</p>
              </div>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              {(devices.mobile + devices.desktop + devices.tablet).toLocaleString()} total
            </span>
          </div>

          {/* Stacked Bar */}
          <div className="w-full h-3 bg-slate-800/60 rounded-full overflow-hidden flex mb-5">
            <div
              style={{ width: `${devices.mobile_pct || 0}%` }}
              className="h-full bg-violet-500 transition-all duration-500"
              title={`Mobile: ${devices.mobile_pct}%`}
            />
            <div
              style={{ width: `${devices.desktop_pct || 0}%` }}
              className="h-full bg-indigo-500 transition-all duration-500"
              title={`Desktop: ${devices.desktop_pct}%`}
            />
            <div
              style={{ width: `${devices.tablet_pct || 0}%` }}
              className="h-full bg-cyan-500 transition-all duration-500"
              title={`Tablet: ${devices.tablet_pct}%`}
            />
          </div>

          <div className="space-y-2.5">
            {deviceItems.map((item) => (
              <div
                key={item.name}
                className="flex items-center justify-between p-3 rounded-lg bg-slate-950/40 border border-slate-800/40 text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-md bg-slate-800/60 flex items-center justify-center text-slate-300">
                    {item.icon}
                  </div>
                  <div>
                    <span className="text-white font-medium">{item.name}</span>
                    <span className="text-slate-400 ml-1.5 font-mono">({item.count})</span>
                  </div>
                </div>
                <span className="font-bold text-white font-mono">{item.pct || 0}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5 pt-3.5 border-t border-slate-800/50 flex items-center justify-between text-[11px] text-slate-500">
          <span>Client agent telemetry</span>
          <span className="text-violet-400 font-medium">Auto-detected</span>
        </div>
      </div>

      {/* Geographic Insights */}
      <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-6 backdrop-blur-sm h-full min-h-[380px] flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/15 flex items-center justify-center text-emerald-400 shrink-0">
                <Globe size={16} />
              </div>
              <div>
                <h3 className="font-semibold text-white text-sm tracking-tight">Geographic Insights</h3>
                <p className="text-xs text-slate-400">Country aggregation (privacy-safe)</p>
              </div>
            </div>
            <span className="text-xs text-slate-400 font-mono">{totalVotes} geo tags</span>
          </div>

          {geography.length === 0 ? (
            <div className="text-center py-12">
              <MapPin size={24} className="text-slate-600 mx-auto mb-2" />
              <p className="text-xs text-slate-500">No geographic data collected yet.</p>
            </div>
          ) : (
            <div className="space-y-3.5">
              {geography.slice(0, 5).map((geo) => (
                <div key={geo.country} className="space-y-1.5 p-2.5 rounded-lg bg-slate-950/30 border border-slate-800/30">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 font-medium text-slate-200">
                      <span className="w-5 h-5 rounded bg-slate-800 text-[10px] font-bold flex items-center justify-center text-slate-300 font-mono">
                        {geo.country.slice(0, 2).toUpperCase()}
                      </span>
                      <span>{geo.country === 'Global' ? 'International / Direct' : geo.country}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-400 font-mono">
                      <span>{geo.votes} votes</span>
                      <span className="font-semibold text-white">{Math.round(geo.percentage)}%</span>
                    </div>
                  </div>
                  <div className="w-full bg-slate-800/50 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500"
                      style={{ width: `${geo.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-5 pt-3.5 border-t border-slate-800/50 flex items-center justify-between text-[11px] text-slate-500">
          <span>Encrypted regional telemetry</span>
          <span className="text-emerald-400 font-medium flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Active
          </span>
        </div>
      </div>
    </div>
  )
}
