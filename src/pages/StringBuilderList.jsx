import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { readEntity, createEntity, updateEntity, deleteEntity } from '../lib/dataService';
import { Plus, ChevronLeft, Trash2, Layers, Play, Pencil, Check, X, MonitorPlay } from 'lucide-react';
import { motion } from 'framer-motion';

function safeId(name) {
  return (name ?? '').trim().replace(/[^a-zA-Z0-9_\-]/g, '_');
}

function RenameInline({ name, onSave, onCancel }) {
  const [val, setVal] = React.useState(name);
  const ref = React.useRef(null);
  React.useEffect(() => { ref.current?.focus(); ref.current?.select(); }, []);
  return (
    <div className="flex items-center gap-1 flex-1 min-w-0" onClick={e => e.stopPropagation()}>
      <input ref={ref} value={val} onChange={e => setVal(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') onSave(val); if (e.key === 'Escape') onCancel(); }}
        className="flex-1 min-w-0 bg-secondary border border-primary/40 rounded px-1.5 py-0.5 text-sm font-semibold text-foreground outline-none focus:border-primary"
      />
      <button onClick={() => onSave(val)} className="text-primary hover:text-primary/80"><Check className="w-3.5 h-3.5" /></button>
      <button onClick={onCancel} className="text-muted-foreground hover:text-foreground"><X className="w-3.5 h-3.5" /></button>
    </div>
  );
}

export default function StringBuilderList() {
  const navigate = useNavigate();
  const [skeletons, setSkeletons] = useState([]);
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const defaultTab = new URLSearchParams(location.search).get('tab') === 'children' ? 'children' : 'skeletons';
  const [tab, setTab] = useState(defaultTab);
  const [renamingId, setRenamingId] = useState(null);

  useEffect(() => {
    Promise.all([
      readEntity('SkeletonAuto'),
      readEntity('ChildAuto'),
    ]).then(([sk, ch]) => {
      const sorted = (arr) => Array.isArray(arr) ? arr.sort((a, b) => new Date(b.updated_date) - new Date(a.updated_date)) : [];
      setSkeletons(sorted(sk));
      setChildren(sorted(ch));
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });
  }, []);

  const createSkeleton = async () => {
    const name = `Auto ${skeletons.length + 1}`;
    try {
      const created = await createEntity('SkeletonAuto', { name, commands: [] });
      const recordId = created?._id ?? created?.id ?? `gen-${Date.now()}`;
      navigate(`/skeleton-builder/${recordId}`);
    } catch (err) {
      // Emergency generation backup routing if the database provider pauses
      navigate(`/skeleton-builder/gen-${Date.now()}`);
    }
  };

  const deleteSkeleton = async (e, id) => {
    e.stopPropagation();
    await deleteEntity('SkeletonAuto', id);
    setSkeletons(prev => prev.filter(s => (s._id ?? s.id) !== id));
  };

  const deleteChild = async (e, id) => {
    e.stopPropagation();
    await deleteEntity('ChildAuto', id);
    setChildren(prev => prev.filter(c => (c._id ?? c.id) !== id));
  };

  const renameSkeleton = async (id, name) => {
    await updateEntity('SkeletonAuto', id, { name });
    setSkeletons(prev => prev.map(s => (s._id ?? s.id) === id ? { ...s, name } : s));
    setRenamingId(null);
  };

  const renameChild = async (id, name) => {
    await updateEntity('ChildAuto', id, { name });
    setChildren(prev => prev.map(c => (c._id ?? c.id) === id ? { ...c, name } : c));
    setRenamingId(null);
  };

  const skeletonName = (id) => skeletons.find(s => (s._id ?? s.id) === id)?.name ?? 'Unknown Template';

  return (
    <div className="min-h-screen bg-background flex flex-col p-6 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-violet-500/5 rounded-full blur-3xl" />
        <svg className="absolute inset-0 w-full h-full opacity-[0.03]" xmlns="http://www.w3.org/2000/svg">
          <defs><pattern id="grid2" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1" /></pattern></defs>
          <rect width="100%" height="100%" fill="url(#grid2)" />
        </svg>
      </div>

      <div className="relative max-w-5xl mx-auto w-full">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => navigate('/')} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Home</span>
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground">Build an Auto</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Create skeleton templates and runnable variant autos.</p>
          </div>
          {tab === 'skeletons' && (
            <button onClick={createSkeleton} className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-semibold hover:bg-violet-500 transition-all">
              <Plus className="w-4 h-4" /> New Skeleton
            </button>
          )}
        </div>

        <div className="flex gap-1 bg-secondary/40 rounded-xl p-1 mb-6 w-fit">
          {[['skeletons', 'Skeleton Autos', Layers], ['children', 'Variant Autos', Play]].map(([id, label, Icon]) => (
            <button key={id} onClick={() => setTab(id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === id ? 'bg-card text-foreground shadow' : 'text-muted-foreground hover:text-foreground'}`}>
              <Icon className="w-4 h-4" />{label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
          </div>
        ) : tab === 'skeletons' ? (
          skeletons.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-24 gap-4">
              <div className="w-16 h-16 rounded-2xl bg-violet-500/10 flex items-center justify-center">
                <Layers className="w-8 h-8 text-violet-400/60" />
              </div>
              <p className="text-muted-foreground text-sm">No skeleton autos yet. Create a template to get started.</p>
              <button onClick={createSkeleton} className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 text-white rounded-lg text-sm font-semibold hover:bg-violet-500 transition-all">
                <Plus className="w-4 h-4" /> Create Skeleton
              </button>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {skeletons.map((sk, i) => {
                const sId = sk._id ?? sk.id;
                if (!sId) return null;
                return (
                  <motion.div key={sId} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                    onClick={() => renamingId !== sId && navigate(`/skeleton-builder/${sId}`)}
                    className="group cursor-pointer rounded-xl bg-card border border-violet-500/20 hover:border-violet-500/50 hover:shadow-lg hover:shadow-violet-500/10 transition-all overflow-hidden">
                    <div className="h-1.5 bg-gradient-to-r from-violet-600 to-purple-500" />
                    <div className="p-4">
                      <div className="flex items-start gap-2 mb-3">
                        <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center shrink-0">
                          <Layers className="w-4 h-4 text-violet-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          {renamingId === sId ? (
                            <RenameInline name={sk.name} onSave={name => renameSkeleton(sId, name)} onCancel={() => setRenamingId(null)} />
                          ) : (
                            <p className="text-sm font-semibold text-foreground truncate">{sk.name}</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-0.5">{(sk.commands?.length ?? 0)} commands</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400 font-medium">Template</span>
                        <span className="text-[10px] text-muted-foreground">· Cannot run directly</span>
                      </div>
                    </div>
                    {renamingId !== sId && (
                      <div className="px-4 pb-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        <button onClick={e => { e.stopPropagation(); setRenamingId(sId); }} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-all">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={e => deleteSkeleton(e, sId)} className="p-1.5 rounded-md text-destructive/60 hover:text-destructive hover:bg-destructive/10 transition-all">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )
        ) : (
          children.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-24 gap-4">
              <div className="w-16 h-16 rounded-2xl bg-green-500/10 flex items-center justify-center">
                <Play className="w-8 h-8 text-green-400/60" />
              </div>
              <p className="text-muted-foreground text-sm">No variant autos yet. Create a skeleton first, then generate variants from it.</p>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {children.map((ch, i) => {
                const cId = ch._id ?? ch.id;
                if (!cId) return null;
                return (
                  <motion.div key={cId} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                    onClick={() => renamingId !== cId && navigate(`/child-builder/${cId}`)}
                    className="group cursor-pointer rounded-xl bg-card border border-green-500/20 hover:border-green-500/50 hover:shadow-lg hover:shadow-green-500/10 transition-all overflow-hidden">
                    <div className="h-1.5 bg-gradient-to-r from-green-600 to-emerald-500" />
                    <div className="p-4">
                      <div className="flex items-start gap-2 mb-3">
                        <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
                          <Play className="w-4 h-4 text-green-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          {renamingId === cId ? (
                            <RenameInline name={ch.name} onSave={name => renameChild(cId, name)} onCancel={() => setRenamingId(null)} />
                          ) : (
                            <p className="text-sm font-semibold text-foreground truncate">{ch.name}</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-0.5">Based on: {skeletonName(ch.skeletonId)}</p>
                        </div>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 font-medium">Variant · Runnable</span>
                    </div>
                    {renamingId !== cId && (
                      <div className="px-4 pb-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        <button onClick={e => { e.stopPropagation(); navigate(`/auto-simulator/${cId}`); }} className="p-1.5 rounded-md text-green-400/70 hover:text-green-400 hover:bg-green-500/10 transition-all" title="Simulate">
                          <MonitorPlay className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={e => { e.stopPropagation(); setRenamingId(cId); }} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-all">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={e => deleteChild(e, cId)} className="p-1.5 rounded-md text-destructive/60 hover:text-destructive hover:bg-destructive/10 transition-all">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )
        )}
      </div>
    </div>
  );
}