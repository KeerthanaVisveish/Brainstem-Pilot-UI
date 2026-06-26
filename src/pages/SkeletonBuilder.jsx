import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Plus, Trash2, GripVertical, Route, Zap, Clock, GitBranch, ChevronDown, ChevronUp } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { readEntity, updateEntity, createEntity } from '../lib/dataService';
import { saveSkeletonToProject } from '../lib/projectFolder';

const COMMAND_TYPES = [
  { type: 'path',      label: 'Path Slot',         icon: Route,      color: 'text-blue-400',   bg: 'bg-blue-500/10',   border: 'border-blue-500/30',   desc: 'Run a specific autonomous path' },
  { type: 'subsystem', label: 'Subsystem Command', icon: Zap,        color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/30', desc: 'Trigger a subsystem action' },
  { type: 'wait',      label: 'Wait',              icon: Clock,      color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', desc: 'Pause for a set duration' },
  { type: 'parallel',  label: 'Parallel Group',    icon: GitBranch,  color: 'text-green-400',  bg: 'bg-green-500/10',  border: 'border-green-500/30',  desc: 'Run commands simultaneously' },
];

const PARALLEL_SUB_TYPES = ['wait', 'subsystem'];
const PALETTE_MIME = 'application/x-skeleton-command';

function InsertionLine() {
  return <div className="h-0.5 bg-primary rounded-full mx-1 shadow-[0_0_8px_rgba(59,130,246,0.6)]" />;
}

function getInsertIndex(container, clientY) {
  if (!container) return 0;
  const rows = container.querySelectorAll('[data-command-row]');
  for (let i = 0; i < rows.length; i++) {
    const rect = rows[i].getBoundingClientRect();
    if (clientY < rect.top + rect.height / 2) return i;
  }
  return rows.length;
}

function PaletteCommandButton({ type, label, icon: Icon, color, bg, border, desc, onAdd, onPaletteDragStart, onPaletteDragEnd }) {
  const didDrag = useRef(false);

  return (
    <div
      draggable
      onDragStart={(e) => {
        didDrag.current = true;
        e.dataTransfer.setData(PALETTE_MIME, type);
        e.dataTransfer.effectAllowed = 'copy';
        onPaletteDragStart(type);
      }}
      onDragEnd={() => {
        onPaletteDragEnd();
        setTimeout(() => { didDrag.current = false; }, 0);
      }}
      role="button"
      tabIndex={0}
      onClick={() => {
        if (didDrag.current) return;
        onAdd(type);
      }}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onAdd(type); }}
      className={`w-full flex items-start gap-2.5 p-3 rounded-xl border ${border} ${bg} hover:opacity-80 transition-all text-left cursor-grab active:cursor-grabbing`}
    >
      <Icon className={`w-4 h-4 ${color} shrink-0 mt-0.5`} />
      <div>
        <p className={`text-xs font-semibold ${color}`}>{label}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{desc}</p>
      </div>
    </div>
  );
}

function createCommand(type) {
  return {
    id: `cmd-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type,
    label: '',
    ...(type === 'wait' ? { defaultWait: 0 } : {}),
    ...(type === 'parallel' ? { parallelSubs: [] } : {}),
  };
}

function CommandCard({ cmd, index, onDelete, onUpdate, subsystems }) {
  const type = COMMAND_TYPES.find(t => t.type === cmd.type) ?? COMMAND_TYPES[0];
  const Icon = type.icon;
  const [parallelOpen, setParallelOpen] = useState(false);

  const selectedSys = subsystems.find(s => s.name === cmd.subsystemName);
  const sysCommands = selectedSys?.commands ?? [];

  const addParallelSub = (subType) => {
    const subs = [...(cmd.parallelSubs ?? []), { id: `psub-${Date.now()}`, type: subType, label: '', defaultWait: 0, subsystemName: '', commandName: '' }];
    onUpdate(index, { parallelSubs: subs });
  };

  const updateParallelSub = (si, updates) => {
    const subs = (cmd.parallelSubs ?? []).map((s, i) => i === si ? { ...s, ...updates } : s);
    onUpdate(index, { parallelSubs: subs });
  };

  const removeParallelSub = (si) => {
    const subs = (cmd.parallelSubs ?? []).filter((_, i) => i !== si);
    onUpdate(index, { parallelSubs: subs });
  };

  return (
    <Draggable draggableId={cmd.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          data-command-row
          className={`rounded-xl border bg-card transition-all ${type.border} ${snapshot.isDragging ? 'shadow-xl opacity-90' : ''}`}
        >
          <div className="flex items-start gap-3 p-3">
            <div {...provided.dragHandleProps} className="mt-1 text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing">
              <GripVertical className="w-4 h-4" />
            </div>
            <div className={`w-8 h-8 rounded-lg ${type.bg} flex items-center justify-center shrink-0`}>
              <Icon className={`w-4 h-4 ${type.color}`} />
            </div>
            <div className="flex-1 min-w-0">
              <span className={`text-xs font-semibold ${type.color}`}>{type.label}</span>
              <input
                value={cmd.label ?? ''}
                onChange={e => onUpdate(index, { label: e.target.value })}
                placeholder={cmd.type === 'path' ? 'Slot label…' : cmd.type === 'subsystem' ? 'Command label…' : cmd.type === 'wait' ? 'Wait description…' : 'Group name…'}
                className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 outline-none border-b border-transparent focus:border-border transition-colors pb-0.5 mt-1"
              />

              {cmd.type === 'wait' && (
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs text-muted-foreground">Default duration:</span>
                  <input type="number" value={cmd.defaultWait ?? 0} step={0.1} min={0}
                    onChange={e => onUpdate(index, { defaultWait: parseFloat(e.target.value) })}
                    className="w-16 bg-secondary/50 border border-border rounded px-1.5 py-0.5 text-xs font-mono text-foreground outline-none focus:border-primary"
                  />
                  <span className="text-xs text-muted-foreground">s</span>
                </div>
              )}

              {cmd.type === 'subsystem' && (
                <div className="flex flex-col gap-2 mt-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground shrink-0">Subsystem:</span>
                    <select
                      value={cmd.subsystemName ?? ''}
                      onChange={e => onUpdate(index, { subsystemName: e.target.value, commandName: '' })}
                      className="flex-1 bg-secondary/50 border border-border rounded px-1.5 py-0.5 text-xs text-foreground outline-none focus:border-primary"
                    >
                      <option value="">— Select —</option>
                      {subsystems.map(s => <option key={s._id ?? s.id ?? s.name} value={s.name}>{s.name}</option>)}
                    </select>
                  </div>
                  {cmd.subsystemName && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground shrink-0">Command:</span>
                      <select
                        value={cmd.commandName ?? ''}
                        onChange={e => onUpdate(index, { commandName: e.target.value })}
                        className="flex-1 bg-secondary/50 border border-border rounded px-1.5 py-0.5 text-xs text-foreground outline-none focus:border-primary"
                      >
                        <option value="">— Select —</option>
                        {sysCommands.map(c => <option key={c._id ?? c.id ?? c.name} value={c.name}>{c.name}</option>)}
                      </select>
                    </div>
                  )}
                </div>
              )}

              {cmd.type === 'parallel' && (
                <div className="mt-2 border border-green-500/20 rounded-lg overflow-hidden">
                  <button onClick={() => setParallelOpen(o => !o)}
                    className="w-full flex items-center justify-between px-3 py-1.5 text-xs text-green-400 hover:bg-green-500/10 transition-colors">
                    <span>{(cmd.parallelSubs ?? []).length} sub-commands</span>
                    {parallelOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                  {parallelOpen && (
                    <div className="px-3 pb-3 space-y-2 border-t border-green-500/20 bg-green-500/5">
                      {(cmd.parallelSubs ?? []).map((sub, si) => (
                        <div key={sub.id} className="mt-2 bg-card rounded-lg p-2.5 space-y-2">
                          <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">{sub.type}</span>
                          {sub.type === 'wait' ? (
                            <div className="flex items-center gap-1">
                              <input type="number" value={sub.defaultWait ?? 0} step={0.1} min={0}
                                onChange={e => updateParallelSub(si, { defaultWait: parseFloat(e.target.value) })}
                                className="w-14 bg-secondary/50 border border-border rounded px-1.5 py-0.5 text-xs font-mono text-foreground outline-none focus:border-primary"
                              />
                              <span className="text-xs text-muted-foreground">s</span>
                            </div>
                          ) : (
                            <div className="flex flex-col gap-2">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground shrink-0 w-16">Subsystem:</span>
                                <select value={sub.subsystemName ?? ''} onChange={e => updateParallelSub(si, { subsystemName: e.target.value, commandName: '' })}
                                  className="flex-1 bg-secondary/50 border border-border rounded px-1.5 py-1 text-xs text-foreground outline-none focus:border-primary min-w-0">
                                  <option value="">— Select —</option>
                                  {subsystems.map(s => <option key={s._id ?? s.id ?? s.name} value={s.name}>{s.name}</option>)}
                                </select>
                              </div>
                              {sub.subsystemName && (
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-muted-foreground shrink-0 w-16">Command:</span>
                                  <select value={sub.commandName ?? ''} onChange={e => updateParallelSub(si, { commandName: e.target.value })}
                                    className="flex-1 bg-secondary/50 border border-border rounded px-1.5 py-1 text-xs text-foreground outline-none focus:border-primary min-w-0">
                                    <option value="">— Select —</option>
                                    {(subsystems.find(s => s.name === sub.subsystemName)?.commands ?? []).map(c => <option key={c._id ?? c.id ?? c.name} value={c.name}>{c.name}</option>)}
                                  </select>
                                </div>
                              )}
                            </div>
                          )}
                          <div className="flex justify-end">
                            <button onClick={() => removeParallelSub(si)} className="text-destructive/50 hover:text-destructive"><Trash2 className="w-3 h-3" /></button>
                          </div>
                        </div>
                      ))}
                      <div className="flex gap-2 mt-1">
                        {PARALLEL_SUB_TYPES.map(t => (
                          <button key={t} onClick={() => addParallelSub(t)}
                            className="flex items-center gap-1 px-2 py-1 bg-green-500/10 text-green-400 rounded text-[10px] font-medium hover:bg-green-500/20 transition-all">
                            <Plus className="w-2.5 h-2.5" /> {t}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            <button onClick={() => onDelete(index)} className="text-destructive/50 hover:text-destructive transition-colors mt-1">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </Draggable>
  );
}

export default function SkeletonBuilder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [skeleton, setSkeleton] = useState(null);
  const [name, setName] = useState('');
  const [commands, setCommands] = useState([]);
  const [subsystems, setSubsystems] = useState([]);
  const [paletteDrag, setPaletteDrag] = useState(null);
  const [insertIndex, setInsertIndex] = useState(null);
  const stateRef = useRef({});
  const savedNameRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    Promise.all([
      readEntity('SkeletonAuto'),
      readEntity('SubsystemConfig'),
    ]).then(([skList, scData]) => {
      const skArray = Array.isArray(skList) ? skList : [];
      let sk = skArray.find(s => String(s._id ?? s.id) === String(id));
      
      // CRITICAL MOCK FALLBACK: If the engine is in a draft 'gen-' state, break out of the ring loop
      if (!sk && String(id).startsWith('gen-')) {
        sk = { id: id, name: 'New Autonomous Template', commands: [] };
      }

      if (!sk) return;
      setSkeleton(sk);
      setName(sk.name ?? '');
      savedNameRef.current = sk.name ?? '';
      setCommands(sk.commands ?? []);
      const scArray = Array.isArray(scData) ? scData : [];
      const sc = scArray[0];
      if (sc) setSubsystems(sc.subsystems ?? []);
    }).catch(() => {
      if (String(id).startsWith('gen-')) {
        const fallbackSk = { id: id, name: 'New Autonomous Template', commands: [] };
        setSkeleton(fallbackSk);
        setName(fallbackSk.name);
        setCommands([]);
      }
    });
  }, [id]);

  useEffect(() => { stateRef.current = { name, commands }; }, [name, commands]);

  const saveTimer = useRef(null);

  const handleSequenceDragOver = (e) => {
    if (!paletteDrag && !e.dataTransfer.types.includes(PALETTE_MIME)) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
    setInsertIndex(getInsertIndex(listRef.current, e.clientY));
  };

  const handleSequenceDrop = (e) => {
    const type = e.dataTransfer.getData(PALETTE_MIME) || paletteDrag;
    if (!type || !COMMAND_TYPES.some(t => t.type === type)) return;
    e.preventDefault();
    e.stopPropagation();
    insertCommandAt(type, getInsertIndex(listRef.current, e.clientY));
    setPaletteDrag(null);
    setInsertIndex(null);
  };

  const clearPaletteDrag = () => {
    setPaletteDrag(null);
    setInsertIndex(null);
  };

  const save = async () => {
    const { name: n, commands: c } = stateRef.current;
    const skeletonData = { name: n, commands: c };
    
    if (String(id).startsWith('gen-')) {
      // If draft state, swap update with an upsert creation sequence
      const created = await createEntity('SkeletonAuto', skeletonData);
      if (created?._id || created?.id) {
        await saveSkeletonToProject(skeletonData, n);
      }
    } else {
      await updateEntity('SkeletonAuto', id, skeletonData);
      await saveSkeletonToProject(skeletonData, savedNameRef.current);
    }
    savedNameRef.current = n;
  };

  const handleBack = async () => { 
    clearTimeout(saveTimer.current);
    stateRef.current = { name, commands }; 
    try {
      await save(); 
    } catch(e){}
    navigate('/string-builder'); 
  };

  const handleNameChange = (v) => {
    setName(v);
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(save, 500);
  };

  const persistCommands = (next) => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const skData = { name, commands: next };
      if (!String(id).startsWith('gen-')) {
        await updateEntity('SkeletonAuto', id, skData);
        await saveSkeletonToProject(skData, savedNameRef.current);
      }
    }, 500);
  };

  const insertCommandAt = (type, index) => {
    const newCmd = createCommand(type);
    setCommands(prev => {
      const next = [...prev];
      next.splice(index, 0, newCmd);
      persistCommands(next);
      return next;
    });
  };

  const addCommand = (type) => insertCommandAt(type, commands.length);

  const deleteCommand = (index) => setCommands(prev => {
    const next = prev.filter((_, i) => i !== index);
    persistCommands(next);
    return next;
  });

  const updateCommand = (index, updates) => setCommands(prev => {
    const next = prev.map((c, i) => i === index ? { ...c, ...updates } : c);
    persistCommands(next);
    return next;
  });

  const onDragEnd = (result) => {
    const { source, destination } = result;
    if (!destination) return;
    if (source.droppableId !== 'commands' || destination.droppableId !== 'commands') return;
    if (source.index === destination.index) return;
    setCommands(prev => {
      const next = Array.from(prev);
      const [moved] = next.splice(result.source.index, 1);
      next.splice(result.destination.index, 0, moved);
      persistCommands(next);
      return next;
    });
  };

  const createVariantAuto = async () => {
    clearTimeout(saveTimer.current);
    await save();
    const variant = await createEntity('ChildAuto', {
      name: `${name} - Variant 1`,
      skeletonId: id,
      commandOverrides: commands.map(c => ({ cmdId: c.id, skip: false })),
    });
    const variantId = variant?._id ?? variant?.id ?? `gen-${Date.now()}`;
    navigate(`/child-builder/${variantId}`);
  };

  if (!skeleton) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-2.5 bg-card border-b border-border z-10 shrink-0 flex-wrap gap-y-2">
        <button onClick={handleBack} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors shrink-0">
          <ChevronLeft className="w-4 h-4" />
          <span className="text-xs font-medium">Auto Builder</span>
        </button>
        <div className="w-px h-5 bg-border shrink-0" />
        <input value={name} onChange={e => handleNameChange(e.target.value)}
          className="flex-1 min-w-[120px] bg-transparent border-none outline-none text-sm font-semibold text-foreground focus:bg-secondary/50 px-1.5 py-0.5 rounded transition-colors"
          placeholder="Skeleton name..." />
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400 font-medium shrink-0 whitespace-nowrap">Template · Not Runnable</span>
        <button onClick={createVariantAuto} className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-semibold hover:bg-green-500 transition-all shrink-0 whitespace-nowrap">
          <Plus className="w-3.5 h-3.5" /> Create Variant Auto
        </button>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex flex-1 min-h-0 overflow-hidden">
          <div
            className="flex-1 min-h-0 overflow-y-auto p-6"
            onDragOver={handleSequenceDragOver}
            onDrop={handleSequenceDrop}
          >
            <div className="max-w-lg mx-auto">
              <p className="text-xs text-muted-foreground mb-4">
                Build your auto sequence below. Drag commands from the panel into any position, or click to add at the end.
              </p>
              <Droppable droppableId="commands">
                {(provided, snapshot) => (
                  <div
                    ref={(el) => {
                      provided.innerRef(el);
                      listRef.current = el;
                    }}
                    {...provided.droppableProps}
                    onDragLeave={(e) => {
                      if (!e.currentTarget.contains(e.relatedTarget)) clearPaletteDrag();
                    }}
                    className={`space-y-2 mb-4 min-h-[60vh] rounded-xl transition-colors ${
                      snapshot.isDraggingOver || paletteDrag ? 'bg-primary/5 ring-1 ring-primary/20' : ''
                    }`}
                  >
                    {commands.length === 0 && !paletteDrag && (
                      <div className="text-center py-12 text-muted-foreground/50 border-2 border-dashed border-border rounded-xl">
                        <p className="text-sm">No commands yet</p>
                        <p className="text-xs mt-1">Drag from the panel → or click to add</p>
                      </div>
                    )}
                    {paletteDrag && insertIndex === 0 && <InsertionLine />}
                    {commands.map((cmd, i) => (
                      <React.Fragment key={cmd.id}>
                        <CommandCard cmd={cmd} index={i} onDelete={deleteCommand} onUpdate={updateCommand} subsystems={subsystems} />
                        {paletteDrag && insertIndex === i + 1 && <InsertionLine />}
                      </React.Fragment>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          </div>

          <div className="w-56 bg-card border-l border-border p-4 shrink-0 overflow-y-auto">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Add Command</p>
            <div className="space-y-2">
              {COMMAND_TYPES.map(({ type, label, icon, color, bg, border, desc }) => (
                <PaletteCommandButton
                  key={type}
                  type={type}
                  label={label}
                  icon={icon}
                  color={color}
                  bg={bg}
                  border={border}
                  desc={desc}
                  onAdd={addCommand}
                  onPaletteDragStart={setPaletteDrag}
                  onPaletteDragEnd={clearPaletteDrag}
                />
              ))}
            </div>
            {subsystems.length === 0 && (
              <p className="text-[10px] text-muted-foreground/50 mt-4 text-center">No subsystems configured</p>
            )}
          </div>
        </div>
      </DragDropContext>
    </div>
  );
}