import React, { useState, useEffect } from 'react';
import { Trash2, Navigation, MapPin, ChevronDown, ChevronUp, Zap, Plus, RotateCcw, Sparkles, PlusCircle } from 'lucide-react';
import { readEntity } from '@/lib/dataService';

// Angle input that allows typing a negative sign without stomping the value
function AngleInput({ value, onChange }) {
  const [text, setText] = useState(String(parseFloat((value ?? 0).toFixed(1))));
  const focused = React.useRef(false);

  // Only sync from external (slider) when not actively typing
  useEffect(() => {
    if (focused.current) return;
    const external = parseFloat((value ?? 0).toFixed(1));
    setText(String(external));
  }, [value]);

  const commit = () => {
    focused.current = false;
    const parsed = parseFloat(text);
    if (!isNaN(parsed)) onChange(parsed);
    else setText(String(parseFloat((value ?? 0).toFixed(1))));
  };

  return (
    <input
      type="text"
      value={text}
      onFocus={(e) => { focused.current = true; e.currentTarget.select(); }}
      onChange={(e) => {
        const v = e.target.value;
        // Allow anything that could be part of a valid number: digits, minus, dot
        if (v === '' || v === '-' || v === '-.' || /^-?\d*\.?\d*$/.test(v)) setText(v);
      }}
      onBlur={commit}
      onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
      className="w-16 bg-secondary/50 border border-border rounded px-1.5 py-0.5 text-xs font-mono text-foreground focus:outline-none focus:border-primary transition-colors text-right" 
    />
  );
}

function NumberInput({ label, value, onChange, step = 0.01, min, max, unit }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-muted-foreground font-medium">{label}</label>
      <div className="flex items-center gap-1">
        <input
          type="number"
          value={parseFloat(value?.toFixed(4) ?? 0)}
          step={step}
          min={min}
          max={max}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="flex-1 bg-secondary/50 border border-border rounded px-2 py-1 text-xs font-mono text-foreground focus:outline-none focus:border-primary transition-colors w-0" 
        />
        {unit && <span className="text-xs text-muted-foreground shrink-0">{unit}</span>}
      </div>
    </div>
  );
}

const OPTIONAL_PARAMS = [
  { key: 'distTol', label: 'Distance Tolerance', unit: 'm', default: 0.1, step: 0.001, min: 0 },
  { key: 'headingTol', label: 'Heading Tolerance', unit: '°', default: 3.0, step: 0.1, min: 0 },
  { key: 'minLinearSpeed', label: 'Min Linear Speed', unit: 'm/s', default: 0, step: 0.1, min: 0, max: 20 },
  { key: 'maxLinearSpeed', label: 'Max Linear Speed', unit: 'm/s', default: 1, step: 0.1, min: 0, max: 20 },
  { key: 'maxTurnPower', label: 'Max Turn Power', unit: '%', default: 1, step: 0.01, min: 0, max: 1 },
  { key: 'maxTime', label: 'Max Time', unit: 's', default: 10, step: 0.1, min: 0 },
  { key: 'passPosition', label: 'Pass Position', unit: '', default: false, type: 'bool' }
];

export function OptionalParamsSection({ wp, onUpdate, initialOpen = false }) {
  const [open, setOpen] = useState(initialOpen);
  const params = wp.params ?? {};

  const toggleParam = (key, defaultVal) => {
    const current = wp.params ?? {};
    if (current[key] !== undefined) {
      const next = { ...current }; delete next[key]; onUpdate({ params: next });
    } else {
      onUpdate({ params: { ...current, [key]: defaultVal } });
    }
  };
  const setParam = (key, val) => onUpdate({ params: { ...(wp.params ?? {}), [key]: val } });

  return (
    <div className="rounded-lg overflow-hidden">
      <button onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors">
        <span className="flex items-center gap-1.5 text-sm"><Sparkles className="w-3.5 h-3.5 text-yellow-400" /><span>Optional Parameters</span></span>
        {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>
      {open &&
        <div className="space-y-1">
          {OPTIONAL_PARAMS.map((p) => {
            const active = params[p.key] !== undefined;
            return (
              <div key={p.key} className="flex items-center gap-2">
                <input type="checkbox" checked={active} onChange={() => toggleParam(p.key, p.default)}
                  className="accent-primary w-3 h-3 shrink-0" id={`param-${p.key}`} />
                <label htmlFor={`param-${p.key}`} className={`text-xs cursor-pointer flex-1 ${active ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                  {p.label}
                </label>
                {active && (
                  p.type === 'bool' ?
                    <button onClick={() => setParam(p.key, !params[p.key])}
                      className={`px-2 py-0.5 rounded text-xs font-medium transition-all shrink-0 ${params[p.key] ? 'bg-primary/20 text-primary' : 'bg-secondary text-muted-foreground'}`}>
                      {params[p.key] ? 'true' : 'false'}
                    </button> :
                    <div className="flex items-center gap-1 shrink-0">
                      <input type="number" value={params[p.key]} step={p.step} min={p.min} max={p.max}
                        onChange={(e) => setParam(p.key, parseFloat(e.target.value))}
                        className="w-16 bg-secondary/50 border border-border rounded px-1.5 py-0.5 text-xs font-mono text-foreground focus:outline-none focus:border-primary transition-colors" />
                      {p.unit && <span className="text-[10px] text-muted-foreground">{p.unit}</span>}
                    </div>
                )}
              </div>
            );
          })}
        </div>
      }
    </div>
  );
}

function RotationTargetsSection({ targets, onUpdate, onUpdateProgressOnly, totalLength, initialOpen = false }) {
  const [open, setOpen] = useState(initialOpen);

  const addTarget = () => {
    onUpdate([...(targets ?? []), { id: `rot-${Date.now()}`, progress: 0, rotation: 0 }]);
  };
  const removeTarget = (i) => onUpdate((targets ?? []).filter((_, idx) => idx !== i));
  const updateTarget = (i, updates) => {
    onUpdate((targets ?? []).map((t, idx) => idx === i ? { ...t, ...updates } : t));
  };
  const updateProgress = (i, progress) => {
    const arcLengthM = progress * (totalLength > 0 ? totalLength : 1);
    const updated = (targets ?? []).map((t, idx) => idx === i ? { ...t, progress, arcLengthM } : t);
    onUpdateProgressOnly(updated);
  };

  return (
    <div className="rounded-lg overflow-hidden">
      <button onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors">
        <span className="flex items-center gap-1.5 text-sm"><RotateCcw className="w-3.5 h-3.5 text-cyan-400" /><span>Rotation Targets</span></span>
        {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>
      {open &&
        <div className="space-y-2">
          {(targets ?? []).length === 0 &&
            <p className="text-[10px] text-muted-foreground/60">No targets. Add one to rotate the robot to a heading at a point along the path.</p>
          }
          {(targets ?? []).map((tgt, i) =>
            <div key={tgt.id ?? i} className="bg-secondary/30 rounded-lg p-2 space-y-1.5 border border-cyan-500/20">
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-cyan-400 font-semibold">@ {Math.round((tgt.progress ?? 0) * 100)}%</span>
                <input type="range" min={0} max={1} step={0.01} value={tgt.progress ?? 0}
                  onChange={(e) => updateProgress(i, parseFloat(e.target.value))}
                  onMouseDown={(e) => e.stopPropagation()}
                  className="flex-1 accent-primary" />
                <button onClick={() => removeTarget(i)} className="text-destructive/50 hover:text-destructive">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-[10px] text-muted-foreground shrink-0">Rot</label>
                <input type="range" min={-180} max={180} step={1} value={-(tgt.rotation ?? 0)}
                  onChange={(e) => updateTarget(i, { rotation: -parseFloat(e.target.value) })}
                  onMouseDown={(e) => e.stopPropagation()}
                  className="flex-1 accent-primary min-w-0" />
                <AngleInput value={tgt.rotation ?? 0} onChange={(v) => updateTarget(i, { rotation: v })} />
                <span className="text-[10px] text-muted-foreground shrink-0">°</span>
              </div>
            </div>
          )}
          <button onClick={addTarget}
            className="flex items-center gap-1 px-2 py-1 bg-cyan-500/10 text-cyan-400 rounded text-xs font-medium hover:bg-cyan-500/20 transition-all">
            <Plus className="w-3 h-3" /> Add Target
          </button>
        </div>
      }
    </div>
  );
}

function SubsystemTriggersSection({ triggers, onUpdate, totalLength, initialOpen = false }) {
  const [open, setOpen] = useState(initialOpen);
  const [subsystems, setSubsystems] = useState([]);

  useEffect(() => {
    readEntity('SubsystemConfig').then((list) => {
      const configs = Array.isArray(list) ? list : [];
      if (configs[0]) setSubsystems(configs[0].subsystems ?? []);
    });
  }, []);

  const addTrigger = () => {
    onUpdate([...(triggers ?? []), { id: `trig-${Date.now()}`, subsystemName: '', commandName: '', progress: 0, arcLengthM: 0 }]);
  };
  const removeTrigger = (i) => onUpdate((triggers ?? []).filter((_, idx) => idx !== i));
  const updateTrigger = (i, updates) => onUpdate((triggers ?? []).map((t, idx) => idx === i ? { ...t, ...updates } : t));

  const updateProgress = (i, progress) => {
    const arcLengthM = progress * (totalLength > 0 ? totalLength : 0);
    onUpdate((triggers ?? []).map((t, idx) => idx === i ? { ...t, progress, arcLengthM } : t));
  };

  return (
    <div className="rounded-lg overflow-hidden">
      <button onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors">
        <span className="flex items-center gap-1.5 text-sm"><Zap className="w-3.5 h-3.5 text-violet-400" /><span>Subsystem Triggers</span></span>
        {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>
      {open &&
        <div className="space-y-2">
          {(triggers ?? []).length === 0 &&
            <p className="text-[10px] text-muted-foreground/60">No triggers. Add one to fire a subsystem command at a point along the path.</p>
          }
          {(triggers ?? []).map((trig, i) => {
            const sys = subsystems.find((s) => s.name === trig.subsystemName);
            const cmds = sys?.commands ?? [];
            return (
              <div key={trig.id ?? i} className="bg-secondary/30 rounded-lg p-2 space-y-1.5 border border-violet-500/20">
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-violet-400 font-semibold">
                    @ {Math.round((trig.progress ?? 0) * 100)}%
                    {trig.arcLengthM > 0 && ` (${trig.arcLengthM.toFixed(2)}m)`}
                  </span>
                  <input type="range" min={0} max={1} step={0.01} value={trig.progress ?? 0}
                    onChange={(e) => updateProgress(i, parseFloat(e.target.value))}
                    onMouseDown={(e) => e.stopPropagation()}
                    className="flex-1 accent-primary" />
                  <button onClick={() => removeTrigger(i)} className="text-destructive/50 hover:text-destructive">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
                <select value={trig.subsystemName ?? ''} onChange={(e) => updateTrigger(i, { subsystemName: e.target.value, commandName: '' })}
                  className="w-full bg-secondary/50 border border-border rounded px-1.5 py-0.5 text-xs text-foreground outline-none focus:border-primary">
                  <option value="">— Subsystem —</option>
                  {subsystems.map((s) => <option key={s.id ?? s.name} value={s.name}>{s.name}</option>)}
                </select>
                {trig.subsystemName &&
                  <select value={trig.commandName ?? ''} onChange={(e) => updateTrigger(i, { commandName: e.target.value })}
                    className="w-full bg-secondary/50 border border-border rounded px-1.5 py-0.5 text-xs text-foreground outline-none focus:border-primary">
                    <option value="">— Command —</option>
                    {cmds.map((c) => <option key={c.id ?? c.name} value={c.name}>{c.name}</option>)}
                  </select>
                }
              </div>
            );
          })}
          <button onClick={addTrigger}
            className="flex items-center gap-1 px-2 py-1 bg-violet-500/10 text-violet-400 rounded text-xs font-medium hover:bg-violet-500/20 transition-all">
            <Plus className="w-3 h-3" /> Add Trigger
          </button>
        </div>
      }
    </div>
  );
}

export default function WaypointSidebar({
  waypoints, selectedIndex, onSelect, onUpdate, onDelete, onInsertAfter,
  constraints, setConstraints, trajectory,
  subsystemTriggers, onUpdateTriggers,
  rotationTargets, onUpdateRotationTargets,
  rotationTargetsInitialOpen = false,
  subsystemTriggersInitialOpen = false,
  optionalParamsInitialOpen = false,
}) {
  const selected = selectedIndex !== null ? waypoints[selectedIndex] : null;
  const [sidebarWidth, setSidebarWidth] = React.useState(256);
  const resizing = React.useRef(false);

  const onMouseDown = (e) => {
    resizing.current = true;
    e.preventDefault();
    const startX = e.clientX;
    const startW = sidebarWidth;
    const onMove = (me) => {
      if (!resizing.current) return;
      const delta = startX - me.clientX;
      setSidebarWidth(Math.max(200, Math.min(600, startW + delta)));
    };
    const onUp = () => { resizing.current = false; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  return (
    <div className="bg-card border-l border-border flex flex-col overflow-hidden shrink-0 relative" style={{ width: sidebarWidth }}>
      <div onMouseDown={onMouseDown} className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/40 transition-colors z-10" />

      {/* Path info */}
      {trajectory &&
        <div className="px-4 py-2.5 border-b border-border shrink-0 flex items-center justify-around">
          <div className="flex flex-col items-center">
            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Distance</span>
            <span className="text-lg font-bold font-mono text-foreground leading-tight">{trajectory.totalLength.toFixed(2)}<span className="text-xs font-semibold text-muted-foreground ml-0.5">m</span></span>
          </div>
          <div className="w-px h-8 bg-border" />
          <div className="flex flex-col items-center">
            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Est. Time</span>
            <span className="text-lg font-bold font-mono text-foreground leading-tight">{trajectory.totalTime.toFixed(2)}<span className="text-xs font-semibold text-muted-foreground ml-0.5">s</span></span>
          </div>
        </div>
      }

      <div className="flex-1 overflow-y-auto">
        {/* Selected waypoint editor */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2 mb-3">
            <Navigation className="w-3.5 h-3.5 text-primary" />
            <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">
              {selected
                ? selectedIndex === 0 ? 'Start Point'
                  : selectedIndex === waypoints.length - 1 ? 'End Point'
                    : `Waypoint ${selectedIndex}`
                : 'No Selection'}
            </h3>
            {selected &&
              <button onClick={() => onDelete(selectedIndex)} className="ml-auto text-destructive/60 hover:text-destructive transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            }
          </div>
          {selected ?
            <div className="space-y-3">
              <NumberInput label="X Position" value={selected.x} onChange={(v) => onUpdate(selectedIndex, { x: v })} step={0.1} min={0} max={16.54} unit="m" />
              <NumberInput label="Y Position" value={selected.y} onChange={(v) => onUpdate(selectedIndex, { y: v })} step={0.1} min={0} max={8.02} unit="m" />
              {onInsertAfter && selectedIndex < waypoints.length - 1 &&
                <button onClick={() => onInsertAfter(selectedIndex)}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-primary/10 border border-primary/30 text-primary rounded-md text-xs font-medium hover:bg-primary/20 transition-all">
                  <PlusCircle className="w-3.5 h-3.5" /> Insert Waypoint After
                </button>
              }

              {(selectedIndex === 0 || selectedIndex === waypoints.length - 1) && (
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-muted-foreground font-medium">Robot Rotation</label>
                  <div className="flex items-center gap-2">
                    <input type="range" min={-180} max={180} step={1} value={-(selected.rotation ?? 0)}
                      onChange={(e) => onUpdate(selectedIndex, { rotation: -parseFloat(e.target.value) })}
                      className="flex-1 accent-primary" />
                    <AngleInput value={selected.rotation ?? 0} onChange={(v) => onUpdate(selectedIndex, { rotation: v })} />
                    <span className="text-xs text-muted-foreground">°</span>
                  </div>
                </div>
              )}
              {selectedIndex !== 0 && (
                <OptionalParamsSection wp={selected} onUpdate={(updates) => onUpdate(selectedIndex, updates)} initialOpen={optionalParamsInitialOpen} />
              )}
            </div> :
            <p className="text-xs text-muted-foreground">
              Click a waypoint or use the <span className="text-primary">Add</span> tool to place one.
            </p>
          }
        </div>

        {/* Rotation targets */}
        {onUpdateRotationTargets &&
          <div className="p-4 border-b border-border">
            <RotationTargetsSection
              targets={rotationTargets ?? []}
              onUpdate={onUpdateRotationTargets}
              onUpdateProgressOnly={(rots) => onUpdateRotationTargets(rots, true)}
              totalLength={trajectory?.totalLength ?? 1}
              initialOpen={rotationTargetsInitialOpen}
            />
          </div>
        }

        {/* Subsystem triggers */}
        {onUpdateTriggers &&
          <div className="p-4 border-b border-border">
            <SubsystemTriggersSection 
              triggers={subsystemTriggers ?? []} 
              onUpdate={onUpdateTriggers} 
              totalLength={trajectory?.totalLength ?? 0}
              initialOpen={subsystemTriggersInitialOpen}
            />
          </div>
        }

        {/* Constraints */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-3.5 h-3.5 rounded-full bg-primary/30 flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
            </div>
            <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">Constraints</h3>
          </div>
          <div className="space-y-3">
            <NumberInput label="Max Velocity" value={constraints.maxVel} onChange={(v) => setConstraints((c) => ({ ...c, maxVel: Math.min(20, Math.max(0.1, v)) }))} step={0.1} min={0.1} max={20} unit="m/s" />
            <NumberInput label="Max Acceleration" value={constraints.maxAccel} onChange={(v) => setConstraints((c) => ({ ...c, maxAccel: Math.min(20, Math.max(0.1, v)) }))} step={0.1} min={0.1} max={20} unit="m/s²" />
          </div>
        </div>

        {/* Waypoint list */}
        <div className="p-3">
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">All Waypoints</h3>
          </div>
          {waypoints.length === 0 ?
            <p className="text-xs text-muted-foreground/60 text-center mt-4">No waypoints yet</p> :
            <div className="space-y-1">
              {waypoints.map((wp, i) =>
                <button key={i} onClick={() => onSelect(i)}
                  className={`w-full text-left px-2.5 py-2 rounded-md transition-all text-xs ${
                    i === selectedIndex ?
                      'bg-primary/15 border border-primary/30 text-foreground' :
                      'hover:bg-secondary/50 text-muted-foreground hover:text-foreground'}`
                  }>
                  <div className="flex items-center gap-2">
                    <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 ${
                      i === 0 ? 'bg-green-500/20 text-green-400' :
                        i === waypoints.length - 1 ? 'bg-red-500/20 text-red-400' : 'bg-primary/20 text-primary'}`
                    }>{i + 1}</span>
                    <span className="font-mono truncate text-[10px]">
                      {i === 0 ? 'Start' : i === waypoints.length - 1 ? 'End' : `WP ${i}`}
                      {' '}({wp.x.toFixed(1)}, {wp.y.toFixed(1)})
                    </span>
                    {(i === 0 || i === waypoints.length - 1) &&
                      <span className="ml-auto font-mono text-[10px] shrink-0">{(wp.rotation ?? 0).toFixed(0)}°</span>}
                  </div>
                </button>
              )}
            </div>
          }
        </div>
      </div>
    </div>
  );
}