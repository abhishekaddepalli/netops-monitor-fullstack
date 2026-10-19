import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ReactFlow, Controls, Background, MiniMap, addEdge, applyNodeChanges, applyEdgeChanges, Handle, Position, BaseEdge, getBezierPath, EdgeLabelRenderer, Panel, useReactFlow } from '@xyflow/react';
import { ArrowLeft, Save, Server, Activity, Network, MousePointer2, Terminal, Zap, X, Download, Search, ShieldCheck, ShieldAlert, Database, Router, LayoutGrid } from 'lucide-react';
import dagre from 'dagre';
import { getMap, updateMap } from '../api/maps';
import { monitorsApi } from '../api/monitors';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';
import NetworkDiscoveryModal from '../components/monitors/NetworkDiscoveryModal';
import html2canvas from 'html2canvas';

// --- Layout Helper ---
const getLayoutedElements = (nodes, edges, direction = 'TB') => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  const isHorizontal = direction === 'LR';
  dagreGraph.setGraph({ rankdir: direction });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: 180, height: 80 });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      position: { x: nodeWithPosition.x - 90, y: nodeWithPosition.y - 40 },
    };
  });

  return { nodes: layoutedNodes, edges };
};

// --- Custom Monitor Node ---
const MonitorNode = ({ data }) => {
  const isUp = data.status === 'UP';
  const isDegraded = data.status === 'DEGRADE' || data.status === 'WARNING';
  const isDown = data.status === 'DOWN';
  const color = isUp ? 'var(--green-500)' : isDegraded ? 'var(--saffron-500)' : isDown ? 'var(--red-500)' : 'var(--navy-600)';
  const glow = isUp ? '0 0 15px rgba(16, 185, 129, 0.4)' : isDegraded ? '0 0 15px rgba(249, 115, 22, 0.4)' : isDown ? '0 0 15px rgba(239, 68, 68, 0.4)' : 'none';

  let Icon = Server;
  const type = data.monitor_type?.toLowerCase() || '';
  if (type.includes('ping') || type.includes('router') || type.includes('switch')) Icon = Router;
  if (type.includes('mysql') || type.includes('postgres') || type.includes('redis')) Icon = Database;
  if (type.includes('http') || type.includes('web')) Icon = Activity;

  return (
    <div style={{
      background: 'linear-gradient(145deg, rgba(30, 41, 59, 0.9), rgba(15, 23, 42, 0.9))',
      backdropFilter: 'blur(10px)',
      padding: '16px',
      borderRadius: '12px',
      border: `2px solid ${color}`,
      boxShadow: glow,
      color: 'var(--white-100)',
      minWidth: '160px',
      display: 'flex',
      alignItems: 'center',
      gap: '12px'
    }}>
      <Handle type="target" position={Position.Top} style={{ background: color, width: 8, height: 8 }} />
      <div style={{ background: 'rgba(255,255,255,0.05)', padding: '8px', borderRadius: '8px', color: color }}>
        <Icon size={24} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden' }}>
        <span style={{ fontSize: '13px', fontWeight: '700', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{data.label || 'Unknown Device'}</span>
        <span style={{ fontSize: '11px', color: 'var(--white-60)' }}>{data.host || data.ip}</span>
        {data.status && (
          <div style={{
            fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: '12px',
            background: color, color: 'var(--white-100)', marginTop: '4px', width: 'fit-content'
          }}>
            {data.status}
          </div>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} style={{ background: color, width: 8, height: 8 }} />
    </div>
  );
};

// --- Custom Edge with NOC Traffic Style ---
const CustomEdge = ({
  id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, style = {}, markerEnd, data
}) => {
  const [edgePath, labelX, labelY] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition });
  
  const isDown = data?.status === 'DOWN';
  const isDegraded = data?.status === 'DEGRADE' || data?.status === 'WARNING';
  const isUp = !isDown && !isDegraded && data?.status; // only up if it has a status

  const defaultColor = data?.isHeatmapMode ? 'var(--chakra-500)' : 'var(--navy-600)';
  const edgeColor = data?.status ? (isDown ? 'var(--red-500)' : isDegraded ? 'var(--saffron-500)' : 'var(--green-500)') : (data?.color || defaultColor);
  const isAnimated = isUp || isDegraded;
  const strokeDasharray = isAnimated ? '8,8' : (data?.lineStyle === 'dashed' ? '5,5' : data?.lineStyle === 'dotted' ? '2,2' : 'none');
  const animationSpeed = isDegraded ? '3s' : '1s';
  
  return (
    <>
      <BaseEdge 
        path={edgePath} 
        markerEnd={markerEnd} 
        style={{ 
          ...style, 
          stroke: edgeColor, 
          strokeWidth: data?.capacity ? (data.capacity > 1000 ? 3 : 2) : 2, 
          strokeDasharray,
          animation: isAnimated ? `edgeFlow ${animationSpeed} linear infinite` : 'none',
          filter: isAnimated ? `drop-shadow(0 0 5px ${edgeColor})` : 'none'
        }} 
      />
      {data?.isTrafficMode && (
        <circle r="4" fill="var(--white-100)" filter={`drop-shadow(0 0 6px ${edgeColor})`}>
          <animateMotion dur={animationSpeed} repeatCount="indefinite" path={edgePath} />
        </circle>
      )}
      {(data?.label && String(data.label).trim() !== '' || (data?.isTrafficMode && (data?.rx !== undefined || data?.tx !== undefined)) || data?.status || data?.capacity) && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              background: 'var(--navy-900)',
              padding: '6px 10px',
              borderRadius: '8px',
              fontSize: '11px',
              fontWeight: '600',
              border: `1px solid ${edgeColor}`,
              color: 'var(--white-100)',
              pointerEvents: 'all',
              zIndex: 10,
              boxShadow: 'var(--glass-shadow)',
              textAlign: 'center'
            }}
            className="nodrag nopan"
          >
            {data.label && <div style={{ marginBottom: '4px' }}>{data.label}</div>}
            {data.status && (
              <div style={{
                fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: '12px',
                background: data.status === 'UP' ? 'var(--green-500)' : data.status === 'DOWN' ? 'var(--red-500)' : 'var(--saffron-500)', 
                color: 'var(--white-100)', marginBottom: '4px', textAlign: 'center'
              }}>
                {data.status}
              </div>
            )}
            {data.capacity && (
              <div style={{ fontSize: 9, color: 'var(--white-40)', textAlign: 'center', marginBottom: '4px' }}>
                {data.capacity} Mbps
              </div>
            )}
            {(data?.isTrafficMode && (data?.rx !== undefined || data?.tx !== undefined)) && (
              <div style={{ display: 'flex', gap: '8px', marginTop: '4px', paddingTop: '4px', borderTop: '1px solid var(--navy-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--green-500)', fontSize: '10px' }}>
                  <span style={{ fontSize: '8px' }}>▼</span> {data.rx || 0} Mbps
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--chakra-400)', fontSize: '10px' }}>
                  <span style={{ fontSize: '8px' }}>▲</span> {data.tx || 0} Mbps
                </div>
              </div>
            )}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
};

const nodeTypes = { monitor: MonitorNode };
const edgeTypes = { custom: CustomEdge };

// --- Main Editor Component ---
export default function NetworkMapEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { theme } = useTheme();
  
  const [map, setMap] = useState(null);
  const [monitors, setMonitors] = useState([]);
  
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  
  // NOC Features State
  const [isTrafficMode, setIsTrafficMode] = useState(false);
  const [isHeatmapMode, setIsHeatmapMode] = useState(false);
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  const [isDiscoveryOpen, setIsDiscoveryOpen] = useState(false);
  // Cache buster for deployment
  const [terminalHistory, setTerminalHistory] = useState([
    { type: 'output', text: 'NOC Terminal initialized.' },
    { type: 'output', text: 'Available commands: ping <ip>, traceroute <ip>, clear' }
  ]);
  const [isTerminalLoading, setIsTerminalLoading] = useState(false);
  const terminalEndRef = useRef(null);
  
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [terminalHistory, isTerminalOpen]);

  // Properties Panel State
  const [selectedNode, setSelectedNode] = useState(null);
  const [isPropertiesOpen, setIsPropertiesOpen] = useState(false);
  const [selectedEdge, setSelectedEdge] = useState(null);
  const [isEdgeSettingsOpen, setIsEdgeSettingsOpen] = useState(false);
  
  // Context Menu State
  const [contextMenu, setContextMenu] = useState(null);

  const reactFlowWrapper = useRef(null);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);

  useEffect(() => {
    loadData();
  }, [id]);

  useEffect(() => {
    setNodes(nds => nds.map(n => ({ ...n, data: { ...n.data, isHeatmapMode } })));
    setEdges(eds => eds.map(e => ({ ...e, data: { ...e.data, isHeatmapMode, isTrafficMode } })));
  }, [isHeatmapMode, isTrafficMode]);

  // Click outside to close context menu
  useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const loadData = async () => {
    try {
      const [mapRes, monRes] = await Promise.all([
        getMap(id),
        monitorsApi.list().then(res => res.data)
      ]);
      
      setMap(mapRes.map);
      setMonitors(monRes.data || monRes.monitors || []);
      
      const rfNodes = (mapRes.map.nodes || []).map(n => ({
        id: n.id,
        type: 'monitor',
        position: { x: n.x_pos, y: n.y_pos },
        data: {
          label: n.label || (n.monitor ? n.monitor.name : 'Unknown'),
          host: n.monitor ? n.monitor.target : null,
          status: n.monitor ? String(n.monitor.status || 'UNKNOWN').toUpperCase() : 'UNKNOWN',
          monitor_type: n.monitor ? n.monitor.type : 'Generic',
          monitor_id: n.monitor_id,
          latency: Math.floor(Math.random() * 50) + 1, // Mock latency
          isHeatmapMode
        }
      }));
      setNodes(rfNodes);
      
      const rfEdges = (mapRes.map.links || []).map(l => ({
        id: l.id,
        source: l.source_node_id,
        target: l.target_node_id,
        type: 'custom',
        label: l.label || (l.monitor ? `${l.monitor.name} (${l.interface_name})` : undefined),
        animated: true,
        data: {
          label: l.label,
          rx: Math.floor(Math.random() * 500),
          tx: Math.floor(Math.random() * 500),
          lineStyle: l.style ? l.style.split('|')[0] : 'solid',
          capacity: l.style && l.style.split('|')[1] ? Number(l.style.split('|')[1]) : 1000,
          color: l.color,
          interface_name: l.interface_name,
          monitor_id: l.monitor_id,
          status: l.monitor ? String(l.monitor.status || 'UNKNOWN').toUpperCase() : null,
          show_traffic: l.show_traffic,
          isHeatmapMode,
          isTrafficMode: l.show_traffic || isTrafficMode
        }
      }));
      setEdges(rfEdges);
      
    } catch (err) {
      toast.error('Failed to load map data');
      navigate('/network-maps');
    }
  };

  const onNodesChange = useCallback((changes) => setNodes((nds) => applyNodeChanges(changes, nds)), []);
  const onEdgesChange = useCallback((changes) => setEdges((eds) => applyEdgeChanges(changes, eds)), []);

  const onConnect = useCallback((params) => setEdges((eds) => addEdge({ ...params, type: 'custom', animated: true, data: { isHeatmapMode, isTrafficMode, lineStyle: 'solid', capacity: 1000 } }, eds)), [isHeatmapMode, isTrafficMode]);

  const onSelectionChange = useCallback(({ nodes }) => {
    if (nodes.length === 1) {
      setSelectedNode(nodes[0]);
      setIsPropertiesOpen(true);
      setIsEdgeSettingsOpen(false);
    } else {
      setSelectedNode(null);
      setIsPropertiesOpen(false);
    }
  }, []);

  const onEdgeClick = useCallback((event, edge) => {
    event.stopPropagation();
    setSelectedEdge(edge);
    setIsEdgeSettingsOpen(true);
    setIsPropertiesOpen(false);
  }, []);

  const onNodeContextMenu = useCallback((event, node) => {
    event.preventDefault();
    if (!reactFlowWrapper.current) return;
    const bounds = reactFlowWrapper.current.getBoundingClientRect();
    setContextMenu({ id: node.id, x: event.clientX - bounds.left, y: event.clientY - bounds.top, node });
  }, []);

  const activeNode = selectedNode ? nodes.find(n => n.id === selectedNode.id) || selectedNode : null;
  const activeEdge = selectedEdge ? edges.find(e => e.id === selectedEdge.id) || selectedEdge : null;

  const deleteNode = () => {
    if (selectedNode) {
      setNodes(nds => nds.filter(n => n.id !== selectedNode.id));
      setSelectedNode(null);
      setIsPropertiesOpen(false);
    }
  };

  const deleteEdge = () => {
    if (selectedEdge) {
      setEdges(eds => eds.filter(e => e.id !== selectedEdge.id));
      setSelectedEdge(null);
      setIsEdgeSettingsOpen(false);
    }
  };

  const onDragStart = (event, monitor) => {
    event.dataTransfer.setData('application/reactflow', JSON.stringify(monitor));
    event.dataTransfer.effectAllowed = 'move';
  };

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback((event) => {
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
        host: monitor.target,
        status: String(monitor.status || 'UNKNOWN').toUpperCase(),
        monitor_type: monitor.type,
        monitor_id: monitor.id,
        latency: Math.floor(Math.random() * 50) + 1,
        isHeatmapMode
      },
    };
    setNodes((nds) => nds.concat(newNode));
  }, [reactFlowInstance, isHeatmapMode]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payloadNodes = nodes.map(n => ({
        id: n.id, 
        monitor_id: n.data.monitor_id, 
        label: n.data.label, 
        x_pos: n.position.x, 
        y_pos: n.position.y
      }));
      const payloadLinks = edges.map(e => ({
        id: e.id.toString().includes('xy-') ? undefined : e.id, 
        source_node_id: e.source, 
        target_node_id: e.target, 
        label: e.data?.label,
        interface_name: e.data?.interface_name,
        monitor_id: e.data?.monitor_id,
        color: e.data?.color,
        style: `${e.data?.lineStyle || 'solid'}|${e.data?.capacity || 1000}`,
        show_traffic: e.data?.show_traffic || false
      }));
      await updateMap(id, { nodes: payloadNodes, links: payloadLinks });
      toast.success('Topology saved successfully');
      loadData();
    } catch (err) {
      toast.error('Failed to save topology');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExport = () => {
    if (!reactFlowWrapper.current) return;
    const bounds = reactFlowWrapper.current.getBoundingClientRect();
    html2canvas(reactFlowWrapper.current, {
      width: bounds.width,
      height: bounds.height,
      backgroundColor: theme === 'light' ? '#FFFFFF' : '#0F2036',
      ignoreElements: (element) => {
        const className = element.className || '';
        if (typeof className === 'string') {
          return className.includes('react-flow__minimap') || 
                 className.includes('react-flow__controls') || 
                 className.includes('react-flow__panel');
        }
        return false;
      }
    }).then((canvas) => {
      const link = document.createElement('a');
      link.download = `${map.name || 'topology'}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      toast.success('Map exported successfully');
    });
  };

  const handleAutoLayout = () => {
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    dagreGraph.setGraph({ rankdir: 'TB', ranksep: 100, nodesep: 150 });

    nodes.forEach((node) => {
      dagreGraph.setNode(node.id, { width: 160, height: 80 });
    });

    edges.forEach((edge) => {
      dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    const layoutedNodes = nodes.map((node) => {
      const nodeWithPosition = dagreGraph.node(node.id);
      return {
        ...node,
        position: {
          x: nodeWithPosition.x - 80,
          y: nodeWithPosition.y - 40,
        },
      };
    });

    setNodes(layoutedNodes);
    toast.success('Auto-layout applied!');
  };

  if (!map) return <div style={{ padding: 48, textAlign: 'center' }}>Loading Canvas...</div>;

  const totalNodes = nodes.length;
  const upNodes = nodes.filter(n => n.data?.status === 'UP').length;
  const downNodes = nodes.filter(n => n.data?.status === 'DOWN').length;
  const healthPercent = totalNodes === 0 ? 100 : Math.round((upNodes / totalNodes) * 100);

  return (
    <div style={{ height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', background: 'var(--navy-900)', borderBottom: '1px solid var(--navy-700)', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button onClick={() => navigate('/network-maps')} style={{ background: 'transparent', border: 'none', color: 'var(--white-60)', cursor: 'pointer' }}>
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 600, color: 'var(--white-100)', margin: 0 }}>{map.name}</h1>
            <div style={{ fontSize: 12, color: 'var(--white-60)' }}>Drag monitors from the sidebar to the canvas</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button className="btn-ghost" onClick={() => setIsHeatmapMode(!isHeatmapMode)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderRadius: '8px' }}>
            <Activity size={16} /> Heatmap
          </button>
          <button className="btn-ghost" onClick={() => setIsTrafficMode(!isTrafficMode)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderRadius: '8px' }}>
            <Zap size={16} /> Traffic Flow
          </button>
          <button className="btn-ghost" onClick={handleAutoLayout} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderRadius: '8px' }}>
            <LayoutGrid size={16} /> Auto-Layout
          </button>
          <button className="btn-ghost" onClick={() => setIsTerminalOpen(!isTerminalOpen)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderRadius: '8px' }}>
            <Terminal size={16} /> Terminal
          </button>
          <button className="btn-ghost" onClick={handleExport} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderRadius: '8px' }}>
            <Download size={16} /> Export
          </button>
          <button className="btn btn-primary" onClick={handleSave} disabled={isSaving}>
            <Save size={16} /> {isSaving ? 'Saving...' : 'Save Topology'}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, position: 'relative', overflow: 'hidden' }}>
        {/* Sidebar */}
        <div style={{ width: 280, background: 'var(--navy-800)', borderRight: '1px solid var(--navy-700)', display: 'flex', flexDirection: 'column', zIndex: 10 }}>
          <div style={{ padding: 16, borderBottom: '1px solid var(--navy-700)', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontWeight: 600, color: 'var(--white-100)' }}>Available Monitors</div>
            <button className="btn btn-primary" onClick={() => setIsDiscoveryOpen(true)} style={{ width: '100%', justifyContent: 'center' }}>
              <Search size={16} /> Discover Networks
            </button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {monitors.map(mon => (
              <div key={mon.id} onDragStart={(e) => onDragStart(e, mon)} draggable style={{ background: 'var(--navy-900)', padding: '12px', borderRadius: 8, border: '1px solid var(--navy-600)', cursor: 'grab', display: 'flex', alignItems: 'center', gap: 12 }}>
                <MousePointer2 size={16} color="var(--chakra-400)" />
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--white-100)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{mon.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--white-60)' }}>{mon.type}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Canvas */}
        <div style={{ flex: 1 }} ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect}
            onInit={setReactFlowInstance} onDrop={onDrop} onDragOver={onDragOver} onSelectionChange={onSelectionChange}
            onEdgeClick={onEdgeClick} onNodeContextMenu={onNodeContextMenu}
            nodeTypes={nodeTypes} edgeTypes={edgeTypes} fitView
            style={{ background: 'var(--navy-900)' }}
            colorMode={theme === 'light' ? 'light' : 'dark'}
          >
            <Controls style={{ background: 'var(--navy-800)', border: '1px solid var(--navy-600)', fill: 'var(--white-100)' }} />
            <Background color="var(--navy-700)" gap={24} size={2} />
            <MiniMap 
              nodeColor={(n) => {
                const isUp = n.data?.status === 'UP';
                const isDegraded = n.data?.status === 'DEGRADE' || n.data?.status === 'WARNING';
                return isUp ? '#10B981' : isDegraded ? '#F97316' : '#EF4444';
              }}
              maskColor={theme === 'light' ? 'rgba(255,255,255,0.3)' : 'rgba(15, 32, 54, 0.7)'}
              style={{ background: 'var(--navy-800)', border: '1px solid var(--navy-600)', borderRadius: '8px' }}
            />
            
            <Panel position="top-right" style={{ display: 'flex', gap: '12px', marginTop: '16px', marginRight: '16px' }}>
              <div style={{
                background: theme === 'light' ? 'rgba(255, 255, 255, 0.8)' : 'rgba(15, 32, 54, 0.8)',
                backdropFilter: 'blur(10px)',
                border: '1px solid var(--navy-border)',
                borderRadius: '12px',
                padding: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                boxShadow: 'var(--glass-shadow)',
                color: 'var(--white-100)'
              }}>
                <div style={{ background: healthPercent === 100 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(249, 115, 22, 0.2)', padding: '10px', borderRadius: '50%', color: healthPercent === 100 ? 'var(--green-500)' : 'var(--saffron-500)' }}>
                  {healthPercent === 100 ? <ShieldCheck size={24} /> : <ShieldAlert size={24} />}
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--white-60)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Network Health</div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: healthPercent === 100 ? 'var(--green-500)' : 'var(--saffron-500)' }}>{healthPercent}%</div>
                </div>
              </div>

              <div style={{
                background: theme === 'light' ? 'rgba(255, 255, 255, 0.8)' : 'rgba(15, 32, 54, 0.8)',
                backdropFilter: 'blur(10px)',
                border: '1px solid var(--navy-border)',
                borderRadius: '12px',
                padding: '16px',
                display: 'flex',
                gap: '24px',
                boxShadow: 'var(--glass-shadow)',
                color: 'var(--white-100)'
              }}>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--white-60)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Devices</div>
                  <div style={{ fontSize: '18px', fontWeight: 700 }}>{totalNodes}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--white-60)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Offline</div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: downNodes > 0 ? 'var(--red-500)' : 'var(--white-100)' }}>{downNodes}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--white-60)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Connections</div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--chakra-500)' }}>{edges.length}</div>
                </div>
              </div>
            </Panel>

          </ReactFlow>
        </div>

        {/* Node Properties Drawer */}
        {isPropertiesOpen && selectedNode && (
          <div style={{ width: 320, background: 'var(--navy-800)', borderLeft: '1px solid var(--navy-border)', padding: 20, zIndex: 50, position: 'absolute', right: 0, top: 0, bottom: 0, boxShadow: '-5px 0 15px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 16, color: 'var(--white-100)' }}>Node Properties</h3>
              <X size={18} style={{ cursor: 'pointer', color: 'var(--white-100)' }} onClick={() => setIsPropertiesOpen(false)} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--white-60)', marginBottom: '4px' }}>Label</label>
                <input type="text" value={activeNode.data?.label || ''} onChange={(e) => setNodes(nds => nds.map(n => n.id === activeNode.id ? { ...n, data: { ...n.data, label: e.target.value } } : n))} style={{ width: '100%', padding: '8px', background: 'var(--navy-900)', border: '1px solid var(--navy-border)', color: 'var(--white-100)', borderRadius: '4px', outline: 'none' }} />
              </div>
              <button onClick={deleteNode} style={{ padding: '8px', background: 'var(--red-500)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', marginTop: '10px' }}>Delete Node</button>
            </div>
          </div>
        )}

        {/* Edge Properties Drawer */}
        {isEdgeSettingsOpen && selectedEdge && (
          <div style={{ width: 320, background: 'var(--navy-800)', borderLeft: '1px solid var(--navy-border)', padding: 20, zIndex: 50, position: 'absolute', right: 0, top: 0, bottom: 0, boxShadow: '-5px 0 15px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 16, color: 'var(--white-100)' }}>Cable Properties</h3>
              <X size={18} style={{ cursor: 'pointer', color: 'var(--white-100)' }} onClick={() => setIsEdgeSettingsOpen(false)} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--white-60)', marginBottom: '4px' }}>Edge Label</label>
                <input type="text" value={activeEdge.data?.label || ''} onChange={(e) => setEdges(eds => eds.map(edge => edge.id === activeEdge.id ? { ...edge, data: { ...edge.data, label: e.target.value } } : edge))} style={{ width: '100%', padding: '8px', background: 'var(--navy-900)', border: '1px solid var(--navy-border)', color: 'var(--white-100)', borderRadius: '4px', outline: 'none' }} placeholder="e.g. Fiber Link" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--white-60)', marginBottom: '4px' }}>Monitor</label>
                <select value={activeEdge.data?.monitor_id || ''} onChange={(e) => setEdges(eds => eds.map(edge => edge.id === activeEdge.id ? { ...edge, data: { ...edge.data, monitor_id: e.target.value } } : edge))} style={{ width: '100%', padding: '8px', background: 'var(--navy-900)', border: '1px solid var(--navy-border)', color: 'var(--white-100)', borderRadius: '4px', outline: 'none' }}>
                  <option value="">None</option>
                  {monitors.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--white-60)', marginBottom: '4px' }}>SNMP Interface Name</label>
                <input type="text" value={activeEdge.data?.interface_name || ''} onChange={(e) => setEdges(eds => eds.map(edge => edge.id === activeEdge.id ? { ...edge, data: { ...edge.data, interface_name: e.target.value } } : edge))} style={{ width: '100%', padding: '8px', background: 'var(--navy-900)', border: '1px solid var(--navy-border)', color: 'var(--white-100)', borderRadius: '4px', outline: 'none' }} placeholder="e.g. eth0" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--white-60)', marginBottom: '4px' }}>Edge Color</label>
                <input type="color" value={activeEdge.data?.color || '#94a3b8'} onChange={(e) => setEdges(eds => eds.map(edge => edge.id === activeEdge.id ? { ...edge, data: { ...edge.data, color: e.target.value } } : edge))} style={{ width: '100%', padding: '4px', background: 'var(--navy-900)', border: '1px solid var(--navy-border)', borderRadius: '4px', outline: 'none', cursor: 'pointer' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--white-60)', marginBottom: '4px' }}>Line Style</label>
                <select value={activeEdge.data?.lineStyle || 'solid'} onChange={(e) => setEdges(eds => eds.map(edge => edge.id === activeEdge.id ? { ...edge, data: { ...edge.data, lineStyle: e.target.value } } : edge))} style={{ width: '100%', padding: '8px', background: 'var(--navy-900)', border: '1px solid var(--navy-border)', color: 'var(--white-100)', borderRadius: '4px', outline: 'none' }}>
                  <option value="solid">Solid</option>
                  <option value="dashed">Dashed</option>
                  <option value="dotted">Dotted</option>
                </select>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: 'var(--white-100)' }}>
                <input type="checkbox" checked={activeEdge.data?.show_traffic || false} onChange={(e) => setEdges(eds => eds.map(edge => edge.id === activeEdge.id ? { ...edge, data: { ...edge.data, show_traffic: e.target.checked, isTrafficMode: e.target.checked } } : edge))} />
                Show Live Traffic Animation
              </label>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--white-60)', marginBottom: '4px' }}>Link Capacity (Mbps)</label>
                <input type="number" value={activeEdge.data?.capacity || 1000} onChange={(e) => setEdges(eds => eds.map(edge => edge.id === activeEdge.id ? { ...edge, data: { ...edge.data, capacity: Number(e.target.value) } } : edge))} style={{ width: '100%', padding: '8px', background: 'var(--navy-900)', border: '1px solid var(--navy-border)', color: 'var(--white-100)', borderRadius: '4px', outline: 'none' }} />
              </div>
              <button onClick={deleteEdge} style={{ padding: '8px', background: 'var(--red-500)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', marginTop: '10px' }}>Disconnect Cable</button>
            </div>
          </div>
        )}

        {/* Context Menu */}
        {contextMenu && (
          <div style={{
            position: 'absolute', top: contextMenu.y - 64, left: contextMenu.x, zIndex: 1000, // Subtracting 64 for header offset approximation
            background: 'var(--navy-800)', border: '1px solid var(--navy-border)',
            boxShadow: 'var(--glass-shadow)', borderRadius: '8px', overflow: 'hidden', minWidth: '150px'
          }}>
            <div style={{ padding: '8px 12px', color: 'var(--white-100)', cursor: 'pointer', borderBottom: '1px solid var(--navy-border)', fontSize: '13px' }} onClick={() => { setSelectedNode(contextMenu.node); setIsPropertiesOpen(true); setIsEdgeSettingsOpen(false); setContextMenu(null); }}>Node Settings</div>
            <div style={{ padding: '8px 12px', color: 'var(--white-100)', cursor: 'pointer', borderBottom: '1px solid var(--navy-border)', fontSize: '13px' }} onClick={() => { toast.success(`Pinging ${contextMenu.node.data.host || contextMenu.node.data.label}...`); setContextMenu(null); }}>Ping</div>
            <div style={{ padding: '8px 12px', color: 'var(--white-100)', cursor: 'pointer', borderBottom: '1px solid var(--navy-border)', fontSize: '13px' }} onClick={() => { toast.success(`Tracing route to ${contextMenu.node.data.host || contextMenu.node.data.label}...`); setContextMenu(null); }}>TraceRoute</div>
            <div style={{ padding: '8px 12px', color: 'var(--red-500)', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }} onClick={() => { setNodes(nds => nds.filter(n => n.id !== contextMenu.id)); setContextMenu(null); }}>Remove Node</div>
          </div>
        )}

        {/* Terminal Drawer */}
        {isTerminalOpen && (
          <div style={{
            position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)',
            width: '80%', maxWidth: '800px', height: '220px', backgroundColor: 'var(--navy-900)',
            borderTop: '1px solid var(--navy-border)', borderLeft: '1px solid var(--navy-border)', borderRight: '1px solid var(--navy-border)',
            borderTopLeftRadius: '16px', borderTopRightRadius: '16px', zIndex: 100, display: 'flex', flexDirection: 'column',
            boxShadow: 'var(--glass-shadow)'
          }}>
            <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--navy-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: 'var(--chakra-500)' }} />
                <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--chakra-500)', letterSpacing: '1px' }}>[ NOC TERMINAL ]</span>
              </div>
              <X size={14} style={{ cursor: 'pointer', color: 'var(--white-100)' }} onClick={() => setIsTerminalOpen(false)} />
            </div>
            <div style={{ flex: 1, padding: '16px', color: 'var(--white-100)', fontFamily: 'monospace', fontSize: '13px', overflowY: 'auto' }}>
              {terminalHistory.map((item, idx) => (
                <div key={idx} style={{ marginBottom: '8px' }}>
                  {item.type === 'command' && (
                    <div style={{ display: 'flex' }}>
                      <span style={{ color: 'var(--green-500)', marginRight: '8px' }}>$</span>
                      <span>{item.text}</span>
                    </div>
                  )}
                  {item.type === 'output' && (
                    <div style={{ color: 'var(--white-60)', whiteSpace: 'pre-wrap' }}>
                      {item.text}
                    </div>
                  )}
                  {item.type === 'error' && (
                    <div style={{ color: 'var(--red-500)', whiteSpace: 'pre-wrap' }}>
                      {item.text}
                    </div>
                  )}
                </div>
              ))}
              {isTerminalLoading && (
                <div style={{ marginBottom: '8px', color: 'var(--white-60)' }}>
                  <span className="spinner" style={{ display: 'inline-block', marginRight: '8px' }}>⟳</span>
                  Running command...
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '16px' }}>
                <span style={{ color: 'var(--green-500)' }}>$</span>
                <input 
                  type="text" 
                  placeholder="Enter command (e.g. ping 8.8.8.8)"
                  disabled={isTerminalLoading}
                  style={{ 
                    flex: 1, background: 'transparent', border: 'none', color: 'var(--white-100)', 
                    outline: 'none', fontFamily: 'monospace', fontSize: '13px'
                  }} 
                  onKeyDown={async (e) => {
                    if (e.key === 'Enter' && e.target.value.trim()) {
                      const cmd = e.target.value.trim();
                      e.target.value = '';
                      const newHistory = [...terminalHistory, { type: 'command', text: cmd }];
                      setTerminalHistory(newHistory);
                      
                      const args = cmd.split(' ');
                      const command = args[0].toLowerCase();
                      
                      if (command === 'clear') {
                        setTerminalHistory([]);
                        return;
                      }
                      
                      setIsTerminalLoading(true);
                      try {
                        let res;
                        if (command === 'ping' && args[1]) {
                          res = await toolsApi.ping({ target: args[1] });
                        } else if (command === 'traceroute' && args[1]) {
                          res = await toolsApi.traceroute({ target: args[1] });
                        } else {
                          setTerminalHistory([...newHistory, { type: 'error', text: `Command not found or missing target: ${command}. Available: ping, traceroute, clear` }]);
                          setIsTerminalLoading(false);
                          return;
                        }
                        setTerminalHistory([...newHistory, { type: 'output', text: res.data.output || 'No output.' }]);
                      } catch (err) {
                        setTerminalHistory([...newHistory, { type: 'error', text: `Error: ${err.message}` }]);
                      } finally {
                        setIsTerminalLoading(false);
                      }
                    }
                  }}
                />
              </div>
              <div ref={terminalEndRef} />
            </div>
          </div>
        )}
      </div>

      {isDiscoveryOpen && <NetworkDiscoveryModal isOpen={isDiscoveryOpen} onClose={() => setIsDiscoveryOpen(false)} />}
    </div>
  );
}
