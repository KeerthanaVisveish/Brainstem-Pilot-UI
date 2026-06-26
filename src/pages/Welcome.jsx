import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Route, Code2, ChevronRight, Zap, Settings2, Play, Cpu, FolderOpen, FolderCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import { getProjectDir, setProjectDir, hasProjectDir, initializeProjectFolder } from '../lib/projectFolder';

const cards = [
{
  icon: Route,
  title: 'Create a Path',
  description: 'Visually build autonomous paths for your FRC robot. Place waypoints, adjust headings, and simulate trajectory following on the 2026 Rebuilt field.',
  href: '/autos',
  cta: 'Open Path Builder',
  color: 'from-blue-500/20 to-cyan-500/10',
  border: 'border-blue-500/30',
  iconColor: 'text-blue-400',
  badge: 'Path Planning',
  badgeColor: 'bg-blue-500/10 text-blue-400'
},
{
  icon: Code2,
  title: 'Build an Auto',
  description: 'Create skeleton autos with sequenced commands, subsystem triggers, and custom waits. Generate runnable variant autos from your templates.',
  href: '/string-builder',
  cta: 'Open Auto Builder',
  color: 'from-violet-500/20 to-purple-500/10',
  border: 'border-violet-500/30',
  iconColor: 'text-violet-400',
  badge: 'Auto Sequencer',
  badgeColor: 'bg-violet-500/10 text-violet-400',
},
{
  icon: Play,
  title: 'Simulate & Preview',
  description: 'Select a variant auto and watch it animate on the field. See paths run in sequence with live subsystem command indicators.',
  href: '/auto-simulator',
  cta: 'Open Simulator',
  color: 'from-green-500/20 to-emerald-500/10',
  border: 'border-green-500/30',
  iconColor: 'text-green-400',
  badge: 'Simulation',
  badgeColor: 'bg-green-500/10 text-green-400',
},
{
  icon: Cpu,
  title: 'Configure Subsystems',
  description: 'Define your robot subsystems, add commands for each, and bind them to visual drawings. Used throughout the auto builder.',
  href: '/subsystem-config',
  cta: 'Configure',
  color: 'from-yellow-500/20 to-orange-500/10',
  border: 'border-yellow-500/30',
  iconColor: 'text-yellow-400',
  badge: 'Subsystems',
  badgeColor: 'bg-yellow-500/10 text-yellow-400',
},
];


export default function Welcome() {
  const [projectName, setProjectName] = useState(null);

  useEffect(() => {
    if (hasProjectDir()) setProjectName(getProjectDir().name);
  }, []);

  const openProject = async () => {
    if (!window.showDirectoryPicker) {
      alert('Your browser does not support the File System Access API. Please use Chrome or Edge.');
      return;
    }
    try {
      const dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
      setProjectDir(dirHandle);
      setProjectName(dirHandle.name);
      // Initialize default settings and subsystem config if not present
      await initializeProjectFolder();
      // Store folder name for potential restoration
      try {
        localStorage.setItem('lastProjectFolder', dirHandle.name);
      } catch (e) {
        // localStorage unavailable; that's ok
      }
    } catch (err) {
      if (err.name === 'SecurityError') {
        // Silently ignore — only works when the app is opened in a standalone browser tab
      } else if (err.name !== 'AbortError') {
        throw err;
      }
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Settings button top-left */}
      <Link to="/settings" className="absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-all z-10">
        <Settings2 className="w-3.5 h-3.5" />
        Settings
      </Link>
      {/* Open project top-right */}
      <button
        onClick={openProject}
        className={`absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all z-10 border ${
          projectName
            ? 'bg-green-500/10 border-green-500/30 text-green-400 hover:bg-green-500/20'
            : 'bg-secondary border-border text-muted-foreground hover:text-foreground hover:bg-secondary/80'
        }`}
      >
        {projectName ? <FolderCheck className="w-3.5 h-3.5" /> : <FolderOpen className="w-3.5 h-3.5" />}
        {projectName ? projectName : 'Open Project'}
      </button>
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-violet-500/5 rounded-full blur-3xl" />
        {/* Grid lines */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.03]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-12 relative mt-10">
        
        <div className="flex items-center justify-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
            <Zap className="w-4 h-4 text-primary" />
          </div>
          <span className="font-semibold text-primary uppercase tracking-widest text-base">AUTONOMOUS BUILDER </span>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-foreground tracking-tight mb-3">BrainSTEM Pilot

        </h1>
        <p className="text-muted-foreground text-base max-w-md mx-auto leading-relaxed">
          Design, simulate, and export autonomous routines for your FRC robot. Built for the 2026 Rebuilt season.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 w-full max-w-3xl relative">
        {cards.map((card, i) =>
        <motion.div
          key={card.title}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 * i }}>
          
            {card.disabled ?
          <div className={`relative rounded-2xl bg-gradient-to-br ${card.color} border ${card.border} p-6 opacity-50 cursor-not-allowed`}>
                <CardContent card={card} />
              </div> :

          <Link
            to={card.href}
            className={`relative rounded-2xl bg-gradient-to-br ${card.color} border ${card.border} p-6 flex flex-col gap-4 group hover:scale-[1.02] transition-all duration-200 hover:shadow-lg hover:shadow-primary/10 block`}>
            
                <CardContent card={card} />
              </Link>
          }
          </motion.div>
        )}
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="mt-10 flex items-center gap-4">
        
        <p className="text-base bg-[hsl(var(--background))] text-[hsl(var(--muted-foreground))]">BrainSTEM Pilot · FRC Auto Planning Tool</p>
        

        
      </motion.div>
    </div>);

}

function CardContent({ card }) {
  return (
    <>
      <div className="flex items-start justify-between">
        <div className={`w-10 h-10 rounded-xl bg-card/50 flex items-center justify-center ${card.iconColor}`}>
          <card.icon className="w-5 h-5" />
        </div>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${card.badgeColor}`}>
          {card.badge}
        </span>
      </div>
      <div>
        <h2 className="text-lg font-bold text-foreground mb-1.5">{card.title}</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">{card.description}</p>
      </div>
      <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground/80 group-hover:text-foreground transition-colors mt-auto">
        {card.cta}
        <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
      </div>
    </>);

}