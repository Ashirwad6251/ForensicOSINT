import { useState, useEffect, useRef } from 'react';
import cytoscape from 'cytoscape';
import {
  Search, Download, Filter, Share2, X, Trash2, Link2, Plus, ZoomIn, ZoomOut, Maximize2, Eye,
} from 'lucide-react';
import { useCase } from '@/components/CaseContext';
import { useToast } from '@/components/Toast';
import { supabase, type EntityRow, type RelationshipRow, type EntityType, type RelationType } from '@/lib/supabase';
import { RiskBadge } from '@/components/Badges';
import { Modal } from '@/components/Modal';
import { logAudit } from '@/lib/audit';

const nodeColors: Record<EntityType, string> = {
  person: '#06b6d4', email: '#10b981', ip: '#ef4444', domain: '#f59e0b',
  username: '#6366f1', phone: '#ec4899', image_hash: '#22d3ee', url: '#84cc16', web_page: '#84cc16',
};
const nodeIcons: Record<EntityType, string> = {
  person: 'USER', email: 'MAIL', ip: 'IP', domain: 'DOM',
  username: 'USR', phone: 'TEL', image_hash: 'IMG', url: 'URL', web_page: 'WEB',
};
const allNodeTypes: EntityType[] = ['person', 'email', 'ip', 'domain', 'username', 'phone', 'image_hash', 'web_page'];
const allRelationTypes: RelationType[] = ['FOUND_ON_WEBSITE', 'OWNED_BY', 'RESOLVES_TO', 'LINKED_TO', 'USES_EMAIL', 'REGISTERED_TO', 'CONNECTED_TO'];

export function LinkAnalysis() {
  const { currentCase } = useCase();
  const { showToast } = useToast();
  const [entities, setEntities] = useState<EntityRow[]>([]);
  const [relationships, setRelationships] = useState<RelationshipRow[]>([]);
  const [selectedNode, setSelectedNode] = useState<EntityRow | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<Set<EntityType>>(new Set(allNodeTypes));
  const [addRelModal, setAddRelModal] = useState(false);
  const [newRel, setNewRel] = useState({ source: '', target: '', type: 'LINKED_TO' as RelationType });
  const cyRef = useRef<cytoscape.Core | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!currentCase) return;
    (async () => {
      const [{ data: ents }, { data: rels }] = await Promise.all([
        supabase.from('entities').select('*').eq('case_id', currentCase.id).order('created_at', { ascending: true }),
        supabase.from('relationships').select('*').eq('case_id', currentCase.id),
      ]);
      setEntities(ents || []);
      setRelationships(rels || []);
    })();
  }, [currentCase]);

  useEffect(() => {
    if (!containerRef.current || entities.length === 0) return;
    const filteredEntities = entities.filter((e) => activeFilters.has(e.type));
    const filteredIds = new Set(filteredEntities.map((e) => e.id));
    const elements: cytoscape.ElementDefinition[] = [
      ...filteredEntities.map((e) => ({ data: { id: e.id, label: e.value.length > 20 ? e.value.slice(0, 18) + '..' : e.value, type: e.type, fullValue: e.value, color: nodeColors[e.type], icon: nodeIcons[e.type], risk: e.risk_level, flagged: e.flagged } })),
      ...relationships.filter((r) => filteredIds.has(r.source_entity_id) && filteredIds.has(r.target_entity_id)).map((r) => ({ data: { id: r.id, source: r.source_entity_id, target: r.target_entity_id, label: r.relation_type } })),
    ];
    if (cyRef.current) { cyRef.current.destroy(); cyRef.current = null; }
    const cy = cytoscape({
      container: containerRef.current, elements,
      style: [
        { selector: 'node', style: { 'background-color': 'data(color)', 'label': 'data(label)', 'color': '#94a3b8', 'font-size': '9px', 'text-valign': 'bottom', 'text-halign': 'center', 'text-margin-y': 4, 'width': 36, 'height': 36, 'border-width': 2, 'border-color': '#334155', 'shape': 'round-rectangle', 'text-wrap': 'wrap', 'text-max-width': '80px' } as cytoscape.Css.Node },
        { selector: 'node[flagged = true]', style: { 'border-color': '#ef4444', 'border-width': 3 } as cytoscape.Css.Node },
        { selector: 'node:selected', style: { 'border-color': '#22d3ee', 'border-width': 4, 'opacity': 1 } as cytoscape.Css.Node },
        { selector: 'edge', style: { 'width': 2, 'line-color': '#475569', 'target-arrow-color': '#64748b', 'target-arrow-shape': 'triangle', 'curve-style': 'bezier', 'label': 'data(label)', 'font-size': '7px', 'color': '#64748b', 'text-rotation': 'autorotate', 'text-background-color': '#0f172a', 'text-background-padding': '2px' } as cytoscape.Css.Edge },
        { selector: '.faded', style: { 'opacity': 0.2 } as cytoscape.Css.Node },
      ],
      layout: { name: 'cose', animate: true, animationDuration: 500, nodeRepulsion: 8000, idealEdgeLength: 120, padding: 40 } as cytoscape.LayoutOptions,
    });
    cy.on('tap', 'node', (evt) => { const id = evt.target.id(); const entity = entities.find((e) => e.id === id); if (entity) setSelectedNode(entity); });
    cy.on('tap', (e) => { if (e.target === cy) setSelectedNode(null); });
    cyRef.current = cy;
    return () => { cy.destroy(); cyRef.current = null; };
  }, [entities, relationships, activeFilters]);

  useEffect(() => {
    if (!cyRef.current) return;
    if (!searchQuery) { cyRef.current.nodes().removeClass('faded'); return; }
    cyRef.current.nodes().addClass('faded');
    const matched = cyRef.current.nodes().filter((n) => { const val = n.data('fullValue') as string; return val.toLowerCase().includes(searchQuery.toLowerCase()); });
    matched.removeClass('faded'); matched.select();
  }, [searchQuery]);

  const toggleFilter = (type: EntityType) => setActiveFilters((prev) => { const next = new Set(prev); if (next.has(type)) next.delete(type); else next.add(type); return next; });

  const exportJSON = () => {
    const data = { case: currentCase?.case_number, entities: entities.map((e) => ({ id: e.id, type: e.type, value: e.value, label: e.label, risk: e.risk_level, flagged: e.flagged })), relationships: relationships.map((r) => ({ source: r.source_entity_id, target: r.target_entity_id, type: r.relation_type })) };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `link-graph-${currentCase?.case_number}.json`; a.click(); URL.revokeObjectURL(url);
    showToast('Graph exported as JSON', 'success');
  };

  const exportPNG = () => {
    if (!cyRef.current) return;
    const png64 = cyRef.current.png({ full: true, scale: 2, bg: '#0f172a' });
    const a = document.createElement('a'); a.href = png64; a.download = `link-graph-${currentCase?.case_number}.png`; a.click();
    showToast('Graph exported as PNG', 'success');
  };

  const handleAddRelationship = async () => {
    if (!currentCase || !newRel.source || !newRel.target) return;
    const { error } = await supabase.from('relationships').insert({ case_id: currentCase.id, source_entity_id: newRel.source, target_entity_id: newRel.target, relation_type: newRel.type });
    if (error) { showToast(`Failed: ${error.message}`, 'error'); return; }
    await logAudit(currentCase.id, 'RELATIONSHIP_ADDED', `New ${newRel.type} relationship added to graph`, 'relationship', '');
    const { data } = await supabase.from('relationships').select('*').eq('case_id', currentCase.id);
    setRelationships(data || []); setNewRel({ source: '', target: '', type: 'LINKED_TO' }); setAddRelModal(false);
    showToast('Relationship added to graph', 'success');
  };

  const handleDeleteEntity = async (entity: EntityRow) => {
    if (!currentCase) return;
    await supabase.from('entities').delete().eq('id', entity.id);
    const [{ data: ents }, { data: rels }] = await Promise.all([supabase.from('entities').select('*').eq('case_id', currentCase.id), supabase.from('relationships').select('*').eq('case_id', currentCase.id)]);
    setEntities(ents || []); setRelationships(rels || []); setSelectedNode(null);
    showToast('Entity removed from graph', 'info');
  };

  if (!currentCase) return <div className="text-muted">Select a case first.</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div><h1 className="text-xl font-bold text-app">Interactive Link Analysis & Relationship Graph</h1><p className="text-sm text-muted">{entities.length} nodes, {relationships.length} edges</p></div>
        <div className="flex items-center gap-2">
          <button onClick={() => setAddRelModal(true)} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-accent-soft text-accent hover:opacity-80"><Plus className="w-4 h-4" /> Add Link</button>
          <button onClick={exportJSON} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm border border-app text-secondary hover:border-accent"><Download className="w-4 h-4" /> JSON</button>
          <button onClick={exportPNG} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm border border-app text-secondary hover:border-accent"><Download className="w-4 h-4" /> PNG</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-9">
          <div className="rounded-xl border border-app bg-panel overflow-hidden">
            <div className="px-4 py-2.5 border-b border-app flex items-center gap-3">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted" />
                <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search nodes..." className="w-full pl-8 pr-3 py-1.5 bg-input border border-app rounded-lg text-xs text-app focus:outline-none focus:border-accent" />
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => cyRef.current?.zoom(cyRef.current.zoom() * 1.2)} className="p-1.5 rounded text-secondary hover:bg-hover"><ZoomIn className="w-4 h-4" /></button>
                <button onClick={() => cyRef.current?.zoom(cyRef.current.zoom() / 1.2)} className="p-1.5 rounded text-secondary hover:bg-hover"><ZoomOut className="w-4 h-4" /></button>
                <button onClick={() => cyRef.current?.fit(undefined, 50)} className="p-1.5 rounded text-secondary hover:bg-hover"><Maximize2 className="w-4 h-4" /></button>
              </div>
            </div>
            <div ref={containerRef} className="h-[600px] w-full bg-card" />
          </div>
        </div>

        <div className="lg:col-span-3 space-y-4">
          <div className="rounded-xl border border-app bg-panel overflow-hidden">
            <div className="px-4 py-2.5 border-b border-app"><h3 className="text-xs font-semibold text-secondary flex items-center gap-2"><Filter className="w-4 h-4 text-accent" /> Node Type Filters</h3></div>
            <div className="p-3 space-y-1">
              {allNodeTypes.map((type) => {
                const active = activeFilters.has(type); const color = nodeColors[type];
                return (
                  <button key={type} onClick={() => toggleFilter(type)} className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-all ${active ? 'text-app' : 'text-muted'}`}>
                    <span className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: active ? color : 'var(--border-base)' }} />
                    <span className="uppercase">{type.replace('_', ' ')}</span>
                    <span className="ml-auto text-muted">{entities.filter((e) => e.type === type).length}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {selectedNode ? (
            <div className="rounded-xl border border-accent bg-panel overflow-hidden">
              <div className="px-4 py-2.5 border-b border-app flex items-center justify-between">
                <h3 className="text-xs font-semibold text-secondary flex items-center gap-2"><Eye className="w-4 h-4 text-accent" /> Node Details</h3>
                <button onClick={() => setSelectedNode(null)} className="text-muted hover:text-app"><X className="w-3.5 h-3.5" /></button>
              </div>
              <div className="p-4 space-y-3">
                <div><div className="text-[10px] uppercase text-muted">Type</div><div className="text-sm text-app uppercase">{selectedNode.type.replace('_', ' ')}</div></div>
                <div><div className="text-[10px] uppercase text-muted">Value</div><div className="text-sm font-mono text-accent break-all">{selectedNode.value}</div></div>
                <div><div className="text-[10px] uppercase text-muted">Label</div><div className="text-sm text-app">{selectedNode.label}</div></div>
                <div className="flex items-center gap-2">
                  <RiskBadge level={selectedNode.risk_level} />
                  {selectedNode.flagged && <span className="px-2 py-0.5 rounded text-xs font-bold bg-danger-soft text-danger border border-danger">FLAGGED</span>}
                </div>
                {Object.keys(selectedNode.metadata).length > 0 && (
                  <div><div className="text-[10px] uppercase text-muted mb-1">Metadata</div><pre className="text-[10px] font-mono text-secondary bg-input rounded p-2 max-h-32 overflow-y-auto scrollbar-thin">{JSON.stringify(selectedNode.metadata, null, 2)}</pre></div>
                )}
                <button onClick={() => handleDeleteEntity(selectedNode)} className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs text-danger hover:bg-danger-soft border border-danger"><Trash2 className="w-3.5 h-3.5" /> Remove from Graph</button>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-app bg-panel p-6 text-center"><Share2 className="w-8 h-8 text-muted mx-auto mb-2" /><p className="text-xs text-muted">Click a node in the graph to view its metadata</p></div>
          )}
        </div>
      </div>

      <Modal open={addRelModal} onClose={() => setAddRelModal(false)} title="Add Relationship" maxWidth="max-w-md">
        <div className="space-y-4">
          <div><label className="block text-xs font-semibold text-muted mb-1">Source Entity</label><select value={newRel.source} onChange={(e) => setNewRel((p) => ({ ...p, source: e.target.value }))} className="w-full px-3 py-2 bg-input border border-app rounded-lg text-sm text-app"><option value="">Select source...</option>{entities.map((e) => <option key={e.id} value={e.id}>[{e.type}] {e.value}</option>)}</select></div>
          <div><label className="block text-xs font-semibold text-muted mb-1">Relationship Type</label><select value={newRel.type} onChange={(e) => setNewRel((p) => ({ ...p, type: e.target.value as RelationType }))} className="w-full px-3 py-2 bg-input border border-app rounded-lg text-sm text-app">{allRelationTypes.map((r) => <option key={r} value={r}>{r}</option>)}</select></div>
          <div><label className="block text-xs font-semibold text-muted mb-1">Target Entity</label><select value={newRel.target} onChange={(e) => setNewRel((p) => ({ ...p, target: e.target.value }))} className="w-full px-3 py-2 bg-input border border-app rounded-lg text-sm text-app"><option value="">Select target...</option>{entities.map((e) => <option key={e.id} value={e.id}>[{e.type}] {e.value}</option>)}</select></div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setAddRelModal(false)} className="px-4 py-2 rounded-lg text-sm text-secondary hover:bg-hover">Cancel</button>
            <button onClick={handleAddRelationship} disabled={!newRel.source || !newRel.target} className="px-4 py-2 rounded-lg text-sm font-semibold bg-accent text-accent-on hover:opacity-90 disabled:opacity-50">Add Link</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
