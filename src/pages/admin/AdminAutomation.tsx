
import React, { useState } from 'react';
import { 
  Zap, 
  Mail, 
  MessageSquare, 
  Phone, 
  Settings, 
  Save, 
  RefreshCw, 
  Bell, 
  ShieldCheck,
  Activity,
  Terminal,
  Cpu
} from 'lucide-react';
import { motion } from 'framer-motion';
import { notificationService, DEFAULT_TEMPLATES, NotificationTemplate } from '../../services/notificationService';
import { automationService, DEFAULT_RULES, AutomationRules } from '../../services/automationService';

interface TemplateCardProps {
  template: NotificationTemplate;
  onUpdate: (id: string, updates: any) => void;
}

const TemplateCard: React.FC<TemplateCardProps> = ({ template, onUpdate }) => (
  <div className="bg-[#0a0a0a] border border-white/10 rounded-xl overflow-hidden group hover:border-[#A855F7]/30 transition-all">
    <div className="p-4 bg-white/[0.02] border-b border-white/10 flex justify-between items-center">
      <div className="flex items-center space-x-3">
        <div className={`p-1.5 rounded ${template.enabled ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
          <Bell className="h-3.5 w-3.5" />
        </div>
        <h3 className="text-[10px] font-mono uppercase tracking-widest text-white">{template.name}</h3>
      </div>
      <button 
        onClick={() => onUpdate(template.id, { enabled: !template.enabled })}
        className={`relative w-8 h-4 rounded-full transition-colors duration-300 ${template.enabled ? 'bg-[#A855F7]/40' : 'bg-white/5'}`}
      >
        <div className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full transition-transform duration-300 ${template.enabled ? 'translate-x-4 bg-[#A855F7]' : 'translate-x-0 bg-gray-600'}`} />
      </button>
    </div>
    <div className="p-4 space-y-4">
      {template.subject && (
        <div className="space-y-1">
          <label className="text-[8px] font-mono text-gray-500 uppercase">Subject Line</label>
          <input 
            value={template.subject}
            onChange={(e) => onUpdate(template.id, { subject: e.target.value })}
            className="w-full bg-white/5 border border-white/5 rounded p-2 text-[10px] font-mono text-gray-300 focus:outline-none focus:border-[#A855F7]/30"
          />
        </div>
      )}
      <div className="space-y-1">
        <label className="text-[8px] font-mono text-gray-500 uppercase">Message Body</label>
        <textarea 
          value={template.content}
          onChange={(e) => onUpdate(template.id, { content: e.target.value })}
          rows={3}
          className="w-full bg-white/5 border border-white/5 rounded p-2 text-[10px] font-mono text-gray-300 focus:outline-none focus:border-[#A855F7]/30 resize-none"
        />
      </div>
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-1.5">
          <Mail className={`h-3 w-3 ${template.channels.includes('email') ? 'text-[#A855F7]' : 'text-gray-600'}`} />
          <span className="text-[8px] font-mono text-gray-500 uppercase">Email</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <MessageSquare className={`h-3 w-3 ${template.channels.includes('sms') ? 'text-[#A855F7]' : 'text-gray-600'}`} />
          <span className="text-[8px] font-mono text-gray-500 uppercase">SMS</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <Phone className={`h-3 w-3 ${template.channels.includes('whatsapp') ? 'text-[#A855F7]' : 'text-gray-600'}`} />
          <span className="text-[8px] font-mono text-gray-500 uppercase">WhatsApp</span>
        </div>
      </div>
    </div>
  </div>
);

const RuleToggle = ({ label, description, enabled, onToggle }: any) => (
  <div className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-lg hover:border-[#A855F7]/20 transition-all">
    <div>
      <h4 className="text-[10px] font-mono uppercase tracking-widest text-white">{label}</h4>
      <p className="text-[9px] font-mono text-gray-500 uppercase tracking-tighter">{description}</p>
    </div>
    <button 
      onClick={onToggle}
      className={`relative w-10 h-5 rounded-full transition-colors duration-300 ${enabled ? 'bg-[#A855F7]/40' : 'bg-white/5'}`}
    >
      <div className={`absolute top-1 left-1 w-3 h-3 rounded-full transition-transform duration-300 ${enabled ? 'translate-x-5 bg-[#A855F7]' : 'translate-x-0 bg-gray-600'}`} />
    </button>
  </div>
);

export default function AdminAutomation() {
  const [templates, setTemplates] = useState<NotificationTemplate[]>(notificationService.getTemplates());
  const [rules, setRules] = useState<AutomationRules>(automationService.getRules());
  const [isSaving, setIsSaving] = useState(false);

  const handleUpdateTemplate = (id: string, updates: any) => {
    notificationService.updateTemplate(id, updates);
    setTemplates([...notificationService.getTemplates()]);
  };

  const handleToggleRule = (key: keyof AutomationRules) => {
    const newRules = { ...rules, [key]: !rules[key] };
    automationService.updateRules(newRules);
    setRules(newRules);
  };

  const handleSaveAll = () => {
    setIsSaving(true);
    setTimeout(() => setIsSaving(false), 1000);
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white p-6 lg:p-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/10 pb-8">
        <div>
          <div className="flex items-center space-x-2 mb-2">
            <Zap className="h-3 w-3 text-[#A855F7] animate-pulse" />
            <span className="text-[10px] font-mono text-[#A855F7] uppercase tracking-[0.2em]">Automation Engine // Logic Core</span>
          </div>
          <h1 className="text-4xl font-bold text-white tracking-tighter uppercase italic">Automation <span className="text-[#A855F7]">Matrix</span></h1>
          <p className="text-gray-500 font-mono text-xs mt-1">Manage Notification Templates & System Workflows</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button 
            onClick={handleSaveAll}
            className="bg-[#A855F7] text-black rounded-lg px-6 py-2 flex items-center space-x-2 hover:bg-[#9333EA] transition-colors font-bold"
          >
            {isSaving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            <span className="text-[10px] font-mono uppercase tracking-widest">{isSaving ? 'Syncing...' : 'Commit Changes'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Workflows & Rules */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-[#0a0a0a] border border-white/10 rounded-xl p-6 space-y-6">
            <div className="flex items-center space-x-3 mb-2">
              <Cpu className="h-4 w-4 text-[#A855F7]" />
              <h3 className="text-xs font-mono uppercase tracking-widest text-white">Workflow Logic</h3>
            </div>
            
            <div className="space-y-4">
              <div className="p-4 bg-white/[0.02] border border-white/5 rounded-lg">
                <h4 className="text-[10px] font-mono uppercase tracking-widest text-[#A855F7] mb-4">E-commerce Protocols</h4>
                <div className="space-y-3">
                  <RuleToggle 
                    label="Auto Stock Reduction" 
                    description="Reduce inventory on successful checkout" 
                    enabled={rules.autoReduceStock}
                    onToggle={() => handleToggleRule('autoReduceStock')}
                  />
                  <RuleToggle 
                    label="Auto Disable Listing" 
                    description="Hide products when stock reaches zero" 
                    enabled={rules.autoDisableOutOfStock}
                    onToggle={() => handleToggleRule('autoDisableOutOfStock')}
                  />
                </div>
              </div>

              <div className="p-4 bg-white/[0.02] border border-white/5 rounded-lg">
                <h4 className="text-[10px] font-mono uppercase tracking-widest text-[#A855F7] mb-4">Rental Protocols</h4>
                <div className="space-y-3">
                  <RuleToggle 
                    label="Date Blocking" 
                    description="Auto-block dates for active rentals" 
                    enabled={rules.autoBlockRentalDates}
                    onToggle={() => handleToggleRule('autoBlockRentalDates')}
                  />
                  <RuleToggle 
                    label="Late Penalty Logic" 
                    description="Apply daily fees for overdue items" 
                    enabled={rules.autoApplyLatePenalty}
                    onToggle={() => handleToggleRule('autoApplyLatePenalty')}
                  />
                </div>
              </div>

              <div className="p-4 bg-white/[0.02] border border-white/5 rounded-lg">
                <h4 className="text-[10px] font-mono uppercase tracking-widest text-[#A855F7] mb-4">Inventory Alerts</h4>
                <div className="space-y-3">
                  <RuleToggle 
                    label="Low Stock Alerts" 
                    description="Notify admin when stock is below threshold" 
                    enabled={rules.autoNotifyAdminOnLowStock}
                    onToggle={() => handleToggleRule('autoNotifyAdminOnLowStock')}
                  />
                  <div className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-lg">
                    <div>
                      <h4 className="text-[10px] font-mono uppercase tracking-widest text-white">Alert Threshold</h4>
                      <p className="text-[9px] font-mono text-gray-500 uppercase tracking-tighter">Units remaining</p>
                    </div>
                    <input 
                      type="number"
                      value={rules.lowStockThreshold}
                      onChange={(e) => setRules({...rules, lowStockThreshold: parseInt(e.target.value)})}
                      className="w-12 bg-white/5 border border-white/10 rounded p-1 text-xs font-mono text-center text-white focus:outline-none focus:border-[#A855F7]/50"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* System Status */}
          <div className="bg-[#0a0a0a] border border-white/10 rounded-xl p-6">
            <div className="flex items-center space-x-3 mb-6">
              <Terminal className="h-4 w-4 text-[#A855F7]" />
              <h3 className="text-xs font-mono uppercase tracking-widest text-white">Automation Logs</h3>
            </div>
            <div className="space-y-3 font-mono text-[9px]">
              <div className="flex items-start space-x-2 text-gray-500">
                <span className="text-[#A855F7]">[05:12:01]</span>
                <span>DAEMON_INIT: Automation engine synchronized.</span>
              </div>
              <div className="flex items-start space-x-2 text-gray-500">
                <span className="text-[#A855F7]">[05:12:05]</span>
                <span>TEMPLATE_LOAD: 5 notification protocols active.</span>
              </div>
              <div className="flex items-start space-x-2 text-emerald-500/70">
                <span className="text-[#A855F7]">[05:14:22]</span>
                <span>RULE_TRIGGER: Stock level check completed.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Templates */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[#0a0a0a] border border-white/10 rounded-xl p-6">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center space-x-3">
                <Bell className="h-4 w-4 text-[#A855F7]" />
                <h3 className="text-xs font-mono uppercase tracking-widest text-white">Notification Templates</h3>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-[9px] font-mono text-gray-500 uppercase">Active Templates:</span>
                <span className="text-[9px] font-mono text-[#A855F7] font-bold">{templates.filter(t => t.enabled).length}/{templates.length}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {templates.map((template) => (
                <TemplateCard 
                  key={template.id} 
                  template={template} 
                  onUpdate={handleUpdateTemplate}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
