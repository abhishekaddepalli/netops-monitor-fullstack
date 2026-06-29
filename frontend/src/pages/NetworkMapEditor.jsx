import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ReactFlow, Controls, Background, MiniMap, addEdge, applyNodeChanges, applyEdgeChanges, Handle, Position } from '@xyflow/react';
import { ArrowLeft, Save, Server, Activity, Network, MousePointer2 } from 'lucide-react';
import { getMap, updateMap } from '../api/maps';
import { monitorsApi } from '../api/monitors';
import { useToast } from '../context/ToastContext';

// --- Custom Monitor Node ---
const MonitorNode = ({ data }) => {
  const isUp = data.status === 'UP';
  const color = isUp ? 'var(--success-500)' : data.status === 'DOWN' ? 'var(--danger-500)' : 'var(--text-muted)';
  const glow = isUp ? '0 0 10px rgba(34, 197, 94, 0.4)' : data.status === 'DOWN' ? '0 0 10px rgba(239, 68, 68, 0.4)' : 'none';

  return (
    <div style={{
      background: 'var(--navy-800)',
      border: `2px solid ${color}`,
      boxShadow: glow,
      borderRadius: 12,
      padding: '12px 20px',
      minWidth: 160,
      color: 'white',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 8,
      position: 'relative'
    }}>
      <Handle type="target" position={Position.Top} style={{ background: color, border: 'none' }} />
      <div style={{ color, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Server size={24} />
      </div>
      <div style={{ fontWeight: 600, fontSize: 14 }}>{data.label}</div>
      <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{data.monitor_type || 'Node'}</div>
      <Handle type="source" position={Position.Bottom} style={{ background: color, border: 'none' }} />
    </div>
  );
};

const nodeTypes = { monitor: MonitorNode };

// --- Main Editor Component ---
export default function NetworkMapEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  
  const [map, setMap] = useState(null);
  const [monitors, setMonitors] = useState([]);
  
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  
  const reactFlowWrapper = useRef(null);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      const [mapRes, monRes] = await Promise.all([
        getMap(id),
        monitorsApi.list().then(res => res.data)
      ]);
      
      setMap(mapRes.map);
      setMonitors(monRes.monitors || []);
      
      // Transform backend nodes to ReactFlow nodes
      const rfNodes = (mapRes.map.nodes || []).map(n => ({
        id: n.id,
        type: 'monitor',
        position: { x: n.x_pos, y: n.y_pos },
        data: {
          label: n.label || (n.monitor ? n.monitor.name : 'Unknown'),
          status: n.monitor ? n.monitor.current_status : 'UNKNOWN',
          monitor_type: n.monitor ? n.monitor.type : 'Generic',
          monitor_id: n.monitor_id
        }
      }));
      setNodes(rfNodes);
      
      // Transform backend links to ReactFlow edges
      const rfEdges = (mapRes.map.links || []).map(l => ({
        id: l.id,
        source: l.source_node_id,
        target: l.target_node_id,
        label: l.label || (l.monitor ? `${l.monitor.name} (${l.interface_name})` : undefined),
        animated: true, // we can make this dynamic later
        style: { stroke: l.color || '#94a3b8', strokeWidth: 2 }
      }));
      setEdges(rfEdges);
      
    } catch (err) {
      toast.error('Failed to load map data');
      navigate('/network-maps');
    }
  };

  const onNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );

  const onEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: '#38bdf8', strokeWidth: 2 } }, eds)),
    []
  );

  const onDragStart = (event, monitor) => {
    event.dataTransfer.setData('application/reactflow', JSON.stringify(monitor));
    event.dataTransfer.effectAllowed = 'move';
  };

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();
      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
      const monitorDataStr = event.dataTransfer.getData('application/reactflow');
      
      if (!monitorDataStr || !reactFlowInstance) return;
      
      const monitor = JSON.parse(monitorDataStr);
      
      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });

      const newNode = {
        id: `node_${Date.now()}`,
        type: 'monitor',
        position,
        data: { 
          label: monitor.name, 
          status: monitor.current_status,
          monitor_type: monitor.type,
          monitor_id: monitor.id
        },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance]
  );

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payloadNodes = nodes.map(n => ({
        id: n.id,
        monitor_id: n.data.monitor_id,
        label: n.data.label,
        x_pos: n.position.x,
        y_pos: n.position.y,
        icon_type: 'server'
      }));
      
      const payloadLinks = edges.map(e => ({
        id: e.id,
        source_node_id: e.source,
        target_node_id: e.target,
        label: e.label,
        color: e.style?.stroke || '#38bdf8',
        style: e.animated ? 'animated' : 'solid'
      }));
      
      await updateMap(id, { nodes: payloadNodes, links: payloadLinks });
      toast.success('Topology saved successfully');
    } catch (err) {
      toast.error('Failed to save topology');
    } finally {
      setIsSaving(false);
    }
  };

  if (!map) return <div style={{ padding: 48, textAlign: 'center' }}>Loading Canvas...</div>;

  return (
    <div style={{ height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
        padding: '16px 24px', background: 'var(--navy-900)', borderBottom: '1px solid var(--navy-700)',
        zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button onClick={() => navigate('/network-maps')} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 600, color: 'white', margin: 0 }}>{map.name}</h1>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Drag monitors from the sidebar to the canvas</div>
          </div>
        </div>
        <button className="btn btn-primary" onClick={handleSave} disabled={isSaving}>
          <Save size={16} /> {isSaving ? 'Saving...' : 'Save Topology'}
        </button>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Sidebar */}
        <div style={{ 
          width: 280, background: 'var(--navy-800)', borderRight: '1px solid var(--navy-700)',
          display: 'flex', flexDirection: 'column'
        }}>
          <div style={{ padding: 16, borderBottom: '1px solid var(--navy-700)', fontWeight: 600, color: 'var(--white-90)' }}>
            Available Monitors
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {monitors.map(mon => (
              <div 
                key={mon.id}
                onDragStart={(e) => onDragStart(e, mon)}
                draggable
                style={{
                  background: 'var(--navy-900)', padding: '12px', borderRadius: 8,
                  border: '1px solid var(--navy-600)', cursor: 'grab',
                  display: 'flex', alignItems: 'center', gap: 12
                }}
              >
                <MousePointer2 size={16} color="var(--primary-400)" />
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'white', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                    {mon.name}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{mon.type}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Canvas */}
        <div style={{ flex: 1 }} ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onInit={setReactFlowInstance}
            onDrop={onDrop}
            onDragOver={onDragOver}
            nodeTypes={nodeTypes}
            fitView
            style={{ background: 'var(--navy-900)' }}
            colorMode="dark"
          >
            <Controls style={{ background: 'var(--navy-800)', border: '1px solid var(--navy-600)', fill: 'white' }} />
            <MiniMap 
              nodeColor={(n) => n.data?.status === 'UP' ? '#22c55e' : n.data?.status === 'DOWN' ? '#ef4444' : '#64748b'} 
              style={{ background: 'var(--navy-800)', border: '1px solid var(--navy-600)' }}
              maskColor="rgba(15, 23, 42, 0.7)"
            />
            <Background color="var(--navy-700)" gap={24} size={2} />
          </ReactFlow>
        </div>
      </div>
    </div>
  );
}
