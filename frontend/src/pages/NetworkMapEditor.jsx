import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ReactFlow, Controls, Background, MiniMap, addEdge, applyNodeChanges, applyEdgeChanges, 
  Handle, Position, BaseEdge, getBezierPath, EdgeLabelRenderer, Panel, useReactFlow 
} from '@xyflow/react';
import { 
  ArrowLeft, Save, Server, Activity, Network, MousePointer2, Terminal, Zap, X, Download, 
  Search, ShieldCheck, ShieldAlert, Database, Router, LayoutGrid, RefreshCw, ZoomIn, 
  ZoomOut, Maximize2, Minimize2, Filter, ChevronLeft, ChevronRight, FileDown, Plus, 
  Link, Link2, Unlink, Radio, Compass, Play, Sparkles, Check, CheckCircle2, ChevronDown, 
  MonitorPlay, ExternalLink
} from 'lucide-react';
import dagre from 'dagre';
import { getMap, updateMap } from '../api/maps';
import { monitorsApi } from '../api/monitors';
import { toolsApi } from '../api/tools';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';
import NetworkDiscoveryModal from '../components/monitors/NetworkDiscoveryModal';
import html2canvas from 'html2canvas';

// --- Multiple Layout Engines ---
const getLayoutedElements = (nodes, edges, direction = 'TB') => {
  if (direction === 'RADIAL') {
    if (nodes.length === 0) return { nodes, edges };
    const radius = Math.max(220, nodes.length * 36);
    const angleStep = (2 * Math.PI) / nodes.length;
    const centerX = 500;
    const centerY = 380;
    return {
      nodes: nodes.map((node, i) => ({
        ...node,
        position: {
          x: Math.round(centerX + radius * Math.cos(i * angleStep)),
          y: Math.round(centerY + radius * Math.sin(i * angleStep)),
        },
      })),
      edges,
    };
  }

  if (direction === 'GRID') {
    if (nodes.length === 0) return { nodes, edges };
    const cols = Math.ceil(Math.sqrt(nodes.length));
    const spacingX = 240;
    const spacingY = 150;
    return {
      nodes: nodes.map((node, i) => ({
        ...node,
        position: {
          x: 100 + (i % cols) * spacingX,
          y: 80 + Math.floor(i / cols) * spacingY,
        },
      })),
      edges,
    };
  }

  // Hierarchical dagre (TB or LR)
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({ rankdir: direction, nodesep: 70, ranksep: 90 });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: 190, height: 90 });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      position: { x: nodeWithPosition.x - 95, y: nodeWithPosition.y - 45 },
    };
  });

  return { nodes: layoutedNodes, edges };
};

// --- Custom Monitor Node with 4-Way Handles & Live Ping Badge ---
const MonitorNode = ({ data, selected }) => {
  const isUp = data.status === 'UP';
  const isDegraded = data.status === 'DEGRADE' || data.status === 'WARNING';
  const isDown = data.status === 'DOWN';
  const color = isUp ? 'var(--green-500)' : isDegraded ? 'var(--saffron-500)' : isDown ? 'var(--red-500)' : 'var(--navy-600)';
  
  const glow = selected
    ? `0 0 25px ${color}, 0 0 12px rgba(56, 189, 248, 0.9)`
    : isUp
    ? '0 0 15px rgba(16, 185, 129, 0.35)'
    : isDegraded
    ? '0 0 16px rgba(249, 115, 22, 0.45)'
    : isDown
    ? '0 0 22px rgba(239, 68, 68, 0.65)'
    : 'none';

  let Icon = Server;
  const type = data.monitor_type?.toLowerCase() || '';
  if (type.includes('ping') || type.includes('router') || type.includes('switch') || type.includes('icmp')) Icon = Router;
  if (type.includes('mysql') || type.includes('postgres') || type.includes('redis') || type.includes('db')) Icon = Database;
  if (type.includes('http') || type.includes('web') || type.includes('ssl')) Icon = Activity;

  return (
    <div 
      style={{
        background: 'linear-gradient(145deg, rgba(22, 33, 52, 0.96), rgba(11, 18, 32, 0.96))',
        backdropFilter: 'blur(12px)',
        padding: '12px 14px',
        borderRadius: '12px',
        border: `2px solid ${selected ? '#38bdf8' : color}`,
        boxShadow: glow,
        color: 'var(--white-100)',
        minWidth: '170px',
        maxWidth: '220px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        cursor: 'pointer',
        transition: 'all 0.18s ease-out',
        userSelect: 'none',
      }}
    >
      {/* 4 Handles for clean multi-directional cable wiring */}
      <Handle type="target" position={Position.Top} style={{ background: color, width: 9, height: 9, border: '2px solid #0b1220' }} />
      <Handle type="source" position={Position.Bottom} style={{ background: color, width: 9, height: 9, border: '2px solid #0b1220' }} />
      <Handle type="target" position={Position.Left} id="l" style={{ background: color, width: 9, height: 9, border: '2px solid #0b1220' }} />
      <Handle type="source" position={Position.Right} id="r" style={{ background: color, width: 9, height: 9, border: '2px solid #0b1220' }} />

      <div style={{
        background: isUp ? 'rgba(16, 185, 129, 0.16)' : isDown ? 'rgba(239, 68, 68, 0.16)' : 'rgba(249, 115, 22, 0.16)',
        padding: '8px',
        borderRadius: '8px',
        color: color,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <Icon size={20} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden', flex: 1 }}>
        <span style={{ fontSize: '13px', fontWeight: '700', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', color: '#f8fafc' }}>
          {data.label || 'Unknown Device'}
        </span>
        <span style={{ fontSize: '11px', color: 'var(--white-60)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', fontFamily: 'var(--font-mono)' }}>
          {data.host || data.ip || '—'}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
          <div style={{
            fontSize: 9.5, fontWeight: 700, padding: '1px 6px', borderRadius: '10px',
            background: color, color: '#ffffff', letterSpacing: '0.4px'
          }}>
            {data.status || 'UNKNOWN'}
          </div>
          {data.latency != null && (
            <span style={{ fontSize: '10px', color: 'var(--white-50)', fontFamily: 'var(--font-mono)' }}>
              {data.latency}ms
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

// --- Custom Edge with NOC Animated Flow Particles ---
const CustomEdge = ({
  id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, style = {}, markerEnd, data
}) => {
  const [edgePath, labelX, labelY] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition });
  
  const isDown = data?.status === 'DOWN';
  const isDegraded = data?.status === 'DEGRADE' || data?.status === 'WARNING';
  const isUp = !isDown && !isDegraded && data?.status;

  const defaultColor = data?.isHeatmapMode ? 'var(--chakra-500)' : 'var(--navy-600)';
  const edgeColor = data?.status ? (isDown ? 'var(--red-500)' : isDegraded ? 'var(--saffron-500)' : 'var(--green-500)') : (data?.color || defaultColor);
  const isAnimated = isUp || isDegraded || data?.isTrafficMode;
  const strokeDasharray = isAnimated ? '8,8' : (data?.lineStyle === 'dashed' ? '6,6' : data?.lineStyle === 'dotted' ? '2,3' : 'none');
  const animationSpeed = isDegraded ? '3s' : (data?.capacity && data.capacity >= 10000 ? '0.7s' : '1.2s');
  
  return (
    <>
      <BaseEdge 
        path={edgePath} 
        markerEnd={markerEnd} 
        style={{ 
          ...style, 
          stroke: edgeColor, 
          strokeWidth: data?.capacity ? (data.capacity >= 10000 ? 3.5 : data.capacity >= 1000 ? 2.5 : 2) : 2, 
          strokeDasharray,
          animation: isAnimated ? `edgeFlow ${animationSpeed} linear infinite` : 'none',
          filter: isAnimated ? `drop-shadow(0 0 5px ${edgeColor})` : 'none'
        }} 
      />

      {/* Live Glowing Packet Particles */}
      {data?.isTrafficMode && (
        <circle r="4.5" fill="#ffffff" filter={`drop-shadow(0 0 8px ${edgeColor})`}>
          <animateMotion dur={animationSpeed} repeatCount="indefinite" path={edgePath} />
        </circle>
      )}

      {(data?.label && String(data.label).trim() !== '' || (data?.isTrafficMode && (data?.rx !== undefined || data?.tx !== undefined)) || data?.status || data?.capacity) && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              background: 'rgba(13, 22, 38, 0.95)',
              padding: '4px 8px',
              borderRadius: '8px',
              fontSize: '11px',
              fontWeight: '600',
              border: `1px solid ${edgeColor}`,
              color: 'var(--white-100)',
              pointerEvents: 'all',
              zIndex: 10,
              boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
              textAlign: 'center',
              cursor: 'pointer',
            }}
            className="nodrag nopan"
          >
            {data.label && <div style={{ marginBottom: '2px', color: '#f1f5f9' }}>{data.label}</div>}
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'center' }}>
              {data.status && (
                <span style={{
                  fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: '8px',
                  background: data.status === 'UP' ? 'var(--green-500)' : data.status === 'DOWN' ? 'var(--red-500)' : 'var(--saffron-500)', 
                  color: 'var(--white-100)'
                }}>
                  {data.status}
                </span>
              )}
              {data.capacity && (
                <span style={{ fontSize: 9.5, color: '#93c5fd', fontFamily: 'var(--font-mono)' }}>
                  {data.capacity >= 1000 ? `${data.capacity / 1000} Gbps` : `${data.capacity} Mbps`}
                </span>
              )}
            </div>
            {(data?.isTrafficMode && (data?.rx !== undefined || data?.tx !== undefined)) && (
              <div style={{ display: 'flex', gap: '6px', marginTop: '3px', paddingTop: '3px', borderTop: '1px solid var(--navy-border)' }}>
                <span style={{ color: 'var(--green-400)', fontSize: '9px' }}>▼ {data.rx || 0}M</span>
                <span style={{ color: '#38bdf8', fontSize: '9px' }}>▲ {data.tx || 0}M</span>
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
  const [isTrafficMode, setIsTrafficMode] = useState(true);
  const [isHeatmapMode, setIsHeatmapMode] = useState(false);
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  const [isDiscoveryOpen, setIsDiscoveryOpen] = useState(false);
  const [isWallboardMode, setIsWallboardMode] = useState(false);
  
  // Interactive Cable Connect Mode (Mobile Touch Helper)
  const [cableConnectSource, setCableConnectSource] = useState(null);

  // Quick Diagnostics State
  const [quickPingResult, setQuickPingResult] = useState(null);
  const [isQuickPinging, setIsQuickPinging] = useState(false);

  // Terminal State
  const [terminalHistory, setTerminalHistory] = useState([
    { type: 'output', text: 'NOC Terminal active. Ready for live diagnostics.' },
    { type: 'output', text: 'Commands: ping <host>, traceroute <host>, clear' }
  ]);
  const [isTerminalLoading, setIsTerminalLoading] = useState(false);
  const terminalEndRef = useRef(null);

  // Search & Filtering
  const [monitorSearch, setMonitorSearch] = useState('');
  const [monitorTypeFilter, setMonitorTypeFilter] = useState('all');
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 768);
  const [exportingFormat, setExportingFormat] = useState(null);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showLayoutMenu, setShowLayoutMenu] = useState(false);
  
  // Properties Panel State
  const [selectedNode, setSelectedNode] = useState(null);
  const [isPropertiesOpen, setIsPropertiesOpen] = useState(false);
  const [selectedEdge, setSelectedEdge] = useState(null);
  const [isEdgeSettingsOpen, setIsEdgeSettingsOpen] = useState(false);
  
  // Context Menu
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

  // Click outside listener for context menu & dropdowns
  useEffect(() => {
    const handleClickOutside = () => {
      setContextMenu(null);
      setShowMoreMenu(false);
      setShowLayoutMenu(false);
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const loadData = async () => {
    try {
      const [mapRes, monRes] = await Promise.all([
        getMap(id),
        monitorsApi.list({ per_page: 200 }).then(res => res.data)
      ]);
      
      setMap(mapRes.map);
      const monList = monRes.data || monRes.monitors || [];
      setMonitors(monList);
      
      const rfNodes = (mapRes.map.nodes || []).map(n => {
        const mon = n.monitor || monList.find(m => m.id === n.monitor_id);
        return {
          id: n.id,
          type: 'monitor',
          position: { x: n.x_pos, y: n.y_pos },
          data: {
            label: n.label || (mon ? mon.name : 'Unknown Device'),
            host: mon ? mon.target : null,
            status: mon ? String(mon.status || 'UNKNOWN').toUpperCase() : 'UNKNOWN',
            monitor_type: mon ? mon.type : 'Generic',
            monitor_id: n.monitor_id,
            latency: mon?.last_response_time_ms || Math.floor(Math.random() * 40) + 5,
            isHeatmapMode
          }
        };
      });
      setNodes(rfNodes);
      
      const rfEdges = (mapRes.map.links || []).map(l => ({
        id: l.id,
        source: l.source_node_id,
        target: l.target_node_id,
        type: 'custom',
        animated: true,
        data: {
          label: l.label,
          rx: Math.floor(Math.random() * 400) + 20,
          tx: Math.floor(Math.random() * 300) + 10,
          lineStyle: l.style ? l.style.split('|')[0] : 'solid',
          capacity: l.style && l.style.split('|')[1] ? Number(l.style.split('|')[1]) : 1000,
          color: l.color,
          interface_name: l.interface_name,
          monitor_id: l.monitor_id,
          status: l.monitor ? String(l.monitor.status || 'UNKNOWN').toUpperCase() : 'UP',
          show_traffic: l.show_traffic ?? true,
          isHeatmapMode,
          isTrafficMode: true
        }
      }));
      setEdges(rfEdges);
      
    } catch (err) {
      toast.error('Failed to load network topology');
      navigate('/network-maps');
    }
  };

  const onNodesChange = useCallback((changes) => setNodes((nds) => applyNodeChanges(changes, nds)), []);
  const onEdgesChange = useCallback((changes) => setEdges((eds) => applyEdgeChanges(changes, eds)), []);

  const onConnect = useCallback((params) => {
    setEdges((eds) => addEdge({ 
      ...params, 
      type: 'custom', 
      animated: true, 
      data: { 
        isHeatmapMode, 
        isTrafficMode, 
        lineStyle: 'solid', 
        capacity: 1000,
        status: 'UP'
      } 
    }, eds));
    toast.success('Cable connected');
  }, [isHeatmapMode, isTrafficMode]);

  // Touch & Click Node Selection / Tap-to-Connect Logic
  const handleNodeClick = (event, node) => {
    event?.stopPropagation();

    // If currently in Tap-to-Connect mode
    if (cableConnectSource) {
      if (cableConnectSource.id === node.id) {
        toast.info('Cannot connect device to itself');
        return;
      }
      const newEdge = {
        id: `link_${Date.now()}`,
        source: cableConnectSource.id,
        target: node.id,
        type: 'custom',
        animated: true,
        data: {
          label: '1 Gbps Link',
          lineStyle: 'solid',
          capacity: 1000,
          color: '#38bdf8',
          isTrafficMode,
          isHeatmapMode,
          status: 'UP'
        }
      };
      setEdges((eds) => addEdge(newEdge, eds));
      toast.success(`Connected ${cableConnectSource.data?.label} ↔ ${node.data?.label}`);
      setCableConnectSource(null);
      return;
    }

    // Normal selection
    setSelectedNode(node);
    setIsPropertiesOpen(true);
    setIsEdgeSettingsOpen(false);
    setQuickPingResult(null);
  };

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
      setEdges(eds => eds.filter(e => e.source !== selectedNode.id && e.target !== selectedNode.id));
      setSelectedNode(null);
      setIsPropertiesOpen(false);
      toast.info('Node removed from map');
    }
  };

  const deleteEdge = () => {
    if (selectedEdge) {
      setEdges(eds => eds.filter(e => e.id !== selectedEdge.id));
      setSelectedEdge(null);
      setIsEdgeSettingsOpen(false);
      toast.info('Cable disconnected');
    }
  };

  // Tap-to-Add single monitor directly to center of screen (Works on Mobile + Desktop)
  const handleAddSingleMonitor = (monitor) => {
    let position = { x: 320, y: 220 };
    if (reactFlowInstance && reactFlowWrapper.current) {
      try {
        const bounds = reactFlowWrapper.current.getBoundingClientRect();
        position = reactFlowInstance.screenToFlowPosition({
          x: bounds.left + bounds.width / 2 + (Math.random() * 80 - 40),
          y: bounds.top + bounds.height / 2 + (Math.random() * 80 - 40),
        });
      } catch {}
    }

    const newNode = {
      id: `node_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      type: 'monitor',
      position,
      data: {
        label: monitor.name,
        host: monitor.target,
        status: String(monitor.status || 'UNKNOWN').toUpperCase(),
        monitor_type: monitor.type,
        monitor_id: monitor.id,
        latency: monitor.last_response_time_ms || 24,
        isHeatmapMode
      }
    };

    setNodes(nds => [...nds, newNode]);
    toast.success(`Added ${monitor.name} to map`);
    if (window.innerWidth <= 768) {
      setIsSidebarOpen(false); // Auto close drawer on mobile after tap
    }
  };

  // One-Click NOC Auto-Populate: Add All Remaining Monitors to Map
  const handleAddAllMonitors = () => {
    if (!monitors || monitors.length === 0) {
      toast.info('No monitors available to add.');
      return;
    }
    const existingIds = new Set(nodes.map(n => n.data?.monitor_id).filter(Boolean));
    const toAdd = monitors.filter(m => !existingIds.has(m.id));

    if (toAdd.length === 0) {
      toast.info('All devices are already on this topology.');
      return;
    }

    const newNodes = toAdd.map((m, idx) => ({
      id: `node_auto_${Date.now()}_${idx}`,
      type: 'monitor',
      position: { x: 100 + (idx % 4) * 220, y: 100 + Math.floor(idx / 4) * 140 },
      data: {
        label: m.name,
        host: m.target,
        status: String(m.status || 'UNKNOWN').toUpperCase(),
        monitor_type: m.type,
        monitor_id: m.id,
        latency: m.last_response_time_ms || 25,
        isHeatmapMode
      }
    }));

    const combined = [...nodes, ...newNodes];
    const layoutRes = getLayoutedElements(combined, edges, 'TB');
    setNodes(layoutRes.nodes);
    toast.success(`Added ${toAdd.length} devices and auto-arranged layout!`);
    if (reactFlowInstance) {
      setTimeout(() => reactFlowInstance.fitView({ padding: 0.2, duration: 600 }), 150);
    }
    if (window.innerWidth <= 768) setIsSidebarOpen(false);
  };

  // Drag and Drop for Desktop
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
    const bounds = reactFlowWrapper.current?.getBoundingClientRect();
    const dataStr = event.dataTransfer.getData('application/reactflow');
    if (!dataStr || !reactFlowInstance || !bounds) return;
    const monitor = JSON.parse(dataStr);
    
    const position = reactFlowInstance.screenToFlowPosition({
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
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
        latency: monitor.last_response_time_ms || 22,
        isHeatmapMode
      },
    };
    setNodes((nds) => nds.concat(newNode));
  }, [reactFlowInstance, isHeatmapMode]);

  // Quick Diagnostic Ping Execution
  const handleQuickPing = async (target) => {
    if (!target) return;
    setIsQuickPinging(true);
    setQuickPingResult(null);
    try {
      const res = await toolsApi.ping({ target });
      setQuickPingResult(res.data?.output || 'Ping succeeded.');
      toast.success(`Ping response received for ${target}`);
    } catch (err) {
      setQuickPingResult(`Error: ${err.message || 'Ping failed'}`);
      toast.error('Ping test failed');
    } finally {
      setIsQuickPinging(false);
    }
  };

  // Save Topology to Backend
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
        id: e.id.toString().includes('xy-') || e.id.toString().includes('link_') ? undefined : e.id, 
        source_node_id: e.source, 
        target_node_id: e.target, 
        label: e.data?.label,
        interface_name: e.data?.interface_name,
        monitor_id: e.data?.monitor_id,
        color: e.data?.color,
        style: `${e.data?.lineStyle || 'solid'}|${e.data?.capacity || 1000}`,
        show_traffic: e.data?.show_traffic ?? true
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

  // Export Topology as PNG, PDF, or JSON
  const handleExport = async (format = 'png') => {
    if (!reactFlowWrapper.current) return;
    setExportingFormat(format);
    toast.info(`Exporting map as ${format.toUpperCase()}...`);

    const filename = `${(map?.name || 'network_map').replace(/[^a-zA-Z0-9.-]/g, '_')}_${new Date().toISOString().slice(0, 10)}`;

    if (format === 'json') {
      try {
        const exportData = {
          name: map.name,
          exported_at: new Date().toISOString(),
          total_nodes: nodes.length,
          total_links: edges.length,
          nodes: nodes.map(n => ({
            id: n.id,
            position: n.position,
            data: n.data
          })),
          links: edges.map(e => ({
            id: e.id,
            source: e.source,
            target: e.target,
            data: e.data
          }))
        };
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}.json`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('JSON topology exported successfully.');
      } finally {
        setExportingFormat(null);
      }
      return;
    }

    try {
      const canvas = await html2canvas(reactFlowWrapper.current, {
        backgroundColor: '#070f1e',
        scale: 2,
        useCORS: true,
        logging: false,
        ignoreElements: (el) => {
          const cls = el.className || '';
          return typeof cls === 'string' && (cls.includes('react-flow__controls') || cls.includes('react-flow__minimap') || cls.includes('map-mobile-dock'));
        }
      });

      if (format === 'png') {
        const link = document.createElement('a');
        link.download = `${filename}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        toast.success('Topology PNG downloaded.');
      } else if (format === 'pdf') {
        const { jsPDF } = await import('jspdf');
        const pdf = new jsPDF('l', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        pdf.addImage(imgData, 'JPEG', 10, 10, pdfWidth - 20, pdfHeight - 20);
        pdf.save(`${filename}.pdf`);
        toast.success('Topology PDF downloaded.');
      }
    } catch (err) {
      toast.error('Export failed. Please try again.');
    } finally {
      setExportingFormat(null);
    }
  };

  // Auto Layout Handler
  const handleAutoLayout = (mode = 'TB') => {
    setShowLayoutMenu(false);
    const layoutResult = getLayoutedElements(nodes, edges, mode);
    setNodes(layoutResult.nodes);
    setEdges(layoutResult.edges);
    toast.success(`Arranged in ${mode === 'TB' ? 'Vertical Hierarchy' : mode === 'LR' ? 'Horizontal Flow' : mode === 'RADIAL' ? 'Radial Ring' : 'Grid'}!`);
    if (reactFlowInstance) {
      setTimeout(() => reactFlowInstance.fitView({ padding: 0.25, duration: 600 }), 100);
    }
  };

  // Live Refresh Status from Backend
  const handleRefreshStatus = async () => {
    toast.info('Syncing real-time device health...');
    try {
      const res = await monitorsApi.list({ per_page: 200 });
      const freshMonitors = res.data?.data || [];
      const monMap = {};
      freshMonitors.forEach(m => { monMap[m.id] = m; });
      setMonitors(freshMonitors);

      setNodes(nds => nds.map(n => {
        if (!n.data.monitor_id || !monMap[n.data.monitor_id]) return n;
        const m = monMap[n.data.monitor_id];
        return {
          ...n,
          data: {
            ...n.data,
            status: String(m.status || 'UNKNOWN').toUpperCase(),
            latency: m.last_response_time_ms || n.data.latency,
            host: m.target
          }
        };
      }));
      toast.success('Network topology synced with live status');
    } catch {
      toast.error('Sync failed');
    }
  };

  // Metrics Calculations
  const totalNodes = nodes.length;
  const upNodes = nodes.filter(n => n.data?.status === 'UP').length;
  const downNodes = nodes.filter(n => n.data?.status === 'DOWN').length;
  const healthPercent = totalNodes > 0 ? Math.round((upNodes / totalNodes) * 100) : 100;

  // Filtered Monitors for Available Devices list
  const filteredMonitors = monitors.filter(m => {
    const matchesSearch = (m.name && m.name.toLowerCase().includes(monitorSearch.toLowerCase())) ||
      (m.target && m.target.toLowerCase().includes(monitorSearch.toLowerCase()));
    const matchesType = monitorTypeFilter === 'all' || m.type === monitorTypeFilter;
    return matchesSearch && matchesType;
  });

  const existingDeviceIds = new Set(nodes.map(n => n.data?.monitor_id).filter(Boolean));

  if (!map) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh', color: 'var(--white-60)' }}>
        <RefreshCw className="animate-spin" size={28} />
      </div>
    );
  }

  return (
    <div style={{ 
      height: isWallboardMode ? '100vh' : 'calc(100vh - 64px)', 
      display: 'flex', 
      flexDirection: 'column',
      position: isWallboardMode ? 'fixed' : 'relative',
      inset: isWallboardMode ? 0 : 'auto',
      zIndex: isWallboardMode ? 99999 : 'auto',
      background: '#070f1e'
    }}>
      
      {/* Tap-to-Connect Glowing Top Banner */}
      {cableConnectSource && (
        <div className="map-connect-banner">
          <Link2 size={16} />
          <span>Tap target device to connect from <strong>{cableConnectSource.data?.label}</strong></span>
          <button 
            onClick={() => setCableConnectSource(null)}
            style={{ background: 'rgba(0,0,0,0.3)', border: 'none', color: '#fff', padding: '2px 8px', borderRadius: 12, cursor: 'pointer', fontSize: 11 }}
          >
            Cancel
          </button>
        </div>
      )}

      {/* Top Navigation & Controls Toolbar */}
      {!isWallboardMode && (
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          padding: '10px 16px', 
          background: 'var(--navy-900)', 
          borderBottom: '1px solid var(--navy-700)', 
          zIndex: 20, 
          flexWrap: 'wrap', 
          gap: 10 
        }}>
          {/* Map Title & Health Badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button 
              onClick={() => navigate('/network-maps')} 
              style={{ background: 'transparent', border: 'none', color: 'var(--white-60)', cursor: 'pointer', padding: 4 }} 
              title="Back to Maps"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--white-100)', display: 'flex', alignItems: 'center', gap: 8 }}>
                {map.name}
                <span style={{ 
                  fontSize: 11, 
                  fontWeight: 700, 
                  padding: '2px 8px', 
                  borderRadius: 12, 
                  background: healthPercent === 100 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)', 
                  color: healthPercent === 100 ? 'var(--green-400)' : 'var(--red-400)' 
                }}>
                  {healthPercent}% Health
                </span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--white-50)' }}>
                {totalNodes} devices &bull; {edges.length} links {downNodes > 0 ? `• ${downNodes} offline` : ''}
              </div>
            </div>
          </div>

          {/* Action Buttons Toolbar */}
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Toggle Available Devices Drawer */}
            <button 
              className={`btn btn-sm ${isSidebarOpen ? 'btn-primary' : 'btn-ghost'}`} 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
              title="Toggle Devices Library" 
              style={{ gap: 6 }}
            >
              <Plus size={14} /> Devices ({monitors.length})
            </button>

            {/* Layout Engines Dropdown */}
            <div style={{ position: 'relative' }}>
              <button 
                className="btn btn-ghost btn-sm" 
                onClick={(e) => { e.stopPropagation(); setShowLayoutMenu(!showLayoutMenu); setShowMoreMenu(false); }}
                style={{ gap: 6 }}
              >
                <LayoutGrid size={14} /> Layout <ChevronDown size={12} />
              </button>
              {showLayoutMenu && (
                <div 
                  onClick={(e) => e.stopPropagation()} 
                  style={{
                    position: 'absolute', top: '100%', right: 0, marginTop: 6,
                    background: 'var(--navy-800)', border: '1px solid var(--navy-600)',
                    borderRadius: 10, padding: 6, minWidth: 180, zIndex: 100,
                    boxShadow: '0 10px 25px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', gap: 2
                  }}
                >
                  <button className="btn btn-ghost btn-sm" onClick={() => handleAutoLayout('TB')} style={{ justifyContent: 'flex-start' }}>Vertical Hierarchy</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => handleAutoLayout('LR')} style={{ justifyContent: 'flex-start' }}>Horizontal Flow</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => handleAutoLayout('RADIAL')} style={{ justifyContent: 'flex-start' }}>Radial / Ring Topology</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => handleAutoLayout('GRID')} style={{ justifyContent: 'flex-start' }}>Grid Alignment</button>
                </div>
              )}
            </div>

            {/* Live Traffic Toggle */}
            <button 
              className={`btn btn-ghost btn-sm${isTrafficMode ? ' active' : ''}`} 
              onClick={() => setIsTrafficMode(!isTrafficMode)} 
              title="Toggle Live Traffic Packets" 
              style={{ gap: 6, color: isTrafficMode ? '#38bdf8' : 'inherit' }}
            >
              <Zap size={14} /> Traffic
            </button>

            {/* Sync Live Status */}
            <button className="btn btn-ghost btn-sm" onClick={handleRefreshStatus} title="Sync Live Monitor Status" style={{ gap: 6 }}>
              <RefreshCw size={14} /> Sync
            </button>

            {/* More Options Dropdown */}
            <div style={{ position: 'relative' }}>
              <button 
                className="btn btn-ghost btn-sm" 
                onClick={(e) => { e.stopPropagation(); setShowMoreMenu(!showMoreMenu); setShowLayoutMenu(false); }}
                title="More Tools"
              >
                ••• More
              </button>
              {showMoreMenu && (
                <div 
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    position: 'absolute', top: '100%', right: 0, marginTop: 6,
                    background: 'var(--navy-800)', border: '1px solid var(--navy-600)',
                    borderRadius: 10, padding: 8, minWidth: 200, zIndex: 100,
                    boxShadow: '0 10px 25px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', gap: 4
                  }}
                >
                  <button className="btn btn-ghost btn-sm" onClick={() => { setIsTerminalOpen(!isTerminalOpen); setShowMoreMenu(false); }} style={{ justifyContent: 'flex-start', gap: 8 }}>
                    <Terminal size={14} /> NOC Terminal
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => { setIsHeatmapMode(!isHeatmapMode); setShowMoreMenu(false); }} style={{ justifyContent: 'flex-start', gap: 8 }}>
                    <Activity size={14} /> {isHeatmapMode ? 'Disable Heatmap' : 'Enable Latency Heatmap'}
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => { setIsDiscoveryOpen(true); setShowMoreMenu(false); }} style={{ justifyContent: 'flex-start', gap: 8 }}>
                    <Search size={14} /> Auto-Discovery Job
                  </button>
                  <div style={{ height: 1, background: 'var(--navy-600)', margin: '4px 0' }} />
                  <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--white-50)', padding: '2px 8px', textTransform: 'uppercase' }}>Exports</div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => { handleExport('png'); setShowMoreMenu(false); }} style={{ flex: 1, justifyContent: 'center', fontSize: 11 }}>PNG</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => { handleExport('pdf'); setShowMoreMenu(false); }} style={{ flex: 1, justifyContent: 'center', fontSize: 11 }}>PDF</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => { handleExport('json'); setShowMoreMenu(false); }} style={{ flex: 1, justifyContent: 'center', fontSize: 11 }}>JSON</button>
                  </div>
                  <div style={{ height: 1, background: 'var(--navy-600)', margin: '4px 0' }} />
                  <button className="btn btn-ghost btn-sm" onClick={() => { toggleWallboardMode(); setShowMoreMenu(false); }} style={{ justifyContent: 'flex-start', gap: 8, color: '#38bdf8' }}>
                    <Maximize2 size={14} /> NOC Wallboard Mode
                  </button>
                </div>
              )}
            </div>

            {/* Save Button */}
            <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={isSaving} style={{ gap: 6 }}>
              <Save size={14} /> {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      )}

      {/* Main Canvas Area + Sidebars */}
      <div style={{ display: 'flex', flex: 1, position: 'relative', overflow: 'hidden' }}>
        
        {/* Mobile Backdrop Overlay when Drawer is open */}
        {isSidebarOpen && (
          <div className="map-mobile-backdrop" onClick={() => setIsSidebarOpen(false)} />
        )}

        {/* Available Devices Library Drawer (Desktop Side & Mobile Slide-over) */}
        {isSidebarOpen && (
          <div className="map-devices-drawer">
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--navy-700)', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--white-100)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Server size={15} color="#38bdf8" /> Available Devices
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 11, color: 'var(--white-50)', fontFamily: 'var(--font-mono)' }}>
                    {nodes.length} on map
                  </span>
                  <button 
                    onClick={() => setIsSidebarOpen(false)}
                    style={{ background: 'transparent', border: 'none', color: 'var(--white-60)', cursor: 'pointer', padding: 2 }}
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
              
              {/* Quick Filter Search */}
              <input 
                type="text"
                placeholder="Search device name or IP..."
                value={monitorSearch}
                onChange={e => setMonitorSearch(e.target.value)}
                style={{
                  background: 'var(--navy-900)',
                  border: '1px solid var(--navy-600)',
                  borderRadius: 6,
                  padding: '7px 10px',
                  color: 'var(--white-100)',
                  fontSize: 12,
                  outline: 'none'
                }}
              />

              {/* Type Category Filter */}
              <select 
                value={monitorTypeFilter} 
                onChange={e => setMonitorTypeFilter(e.target.value)}
                style={{
                  background: 'var(--navy-900)',
                  border: '1px solid var(--navy-600)',
                  borderRadius: 6,
                  padding: '7px 10px',
                  color: 'var(--white-90)',
                  fontSize: 12,
                  outline: 'none'
                }}
              >
                <option value="all">All Categories ({monitors.length})</option>
                <option value="http">HTTP / Websites</option>
                <option value="ping">Ping / ICMP Routers</option>
                <option value="tcp_port">TCP Port Services</option>
                <option value="server_agent">Server Agents</option>
                <option value="snmp">SNMP Network Switches</option>
                <option value="ssl">SSL Certificates</option>
                <option value="dns">DNS Resolvers</option>
              </select>

              {/* One-Click NOC Actions */}
              <div style={{ display: 'flex', gap: 6 }}>
                <button 
                  className="btn btn-secondary btn-sm" 
                  onClick={handleAddAllMonitors} 
                  style={{ flex: 1, justifyContent: 'center', gap: 5, fontSize: 11.5 }}
                  title="Place all unplaced devices onto map with auto layout"
                >
                  <Sparkles size={13} color="#38bdf8" /> Add All Devices
                </button>
                <button 
                  className="btn btn-ghost btn-sm" 
                  onClick={() => setIsDiscoveryOpen(true)} 
                  title="Run Network Discovery Job"
                  style={{ padding: '6px 10px' }}
                >
                  <Search size={14} />
                </button>
              </div>
            </div>

            {/* Device Items List */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {filteredMonitors.length === 0 ? (
                <div style={{ padding: '30px 12px', textAlign: 'center', color: 'var(--white-50)', fontSize: 12 }}>
                  No matching devices found.
                </div>
              ) : (
                filteredMonitors.map(mon => {
                  const isAlreadyOnMap = existingDeviceIds.has(mon.id);
                  return (
                    <div 
                      key={mon.id} 
                      onDragStart={(e) => onDragStart(e, mon)} 
                      draggable 
                      onClick={() => handleAddSingleMonitor(mon)}
                      style={{ 
                        background: 'var(--navy-900)', 
                        padding: '10px 12px', 
                        borderRadius: 8, 
                        border: isAlreadyOnMap ? '1px solid rgba(56, 189, 248, 0.2)' : '1px solid var(--navy-700)', 
                        cursor: 'pointer', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 10,
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = '#38bdf8'}
                      onMouseLeave={e => e.currentTarget.style.borderColor = isAlreadyOnMap ? 'rgba(56, 189, 248, 0.2)' : 'var(--navy-700)'}
                    >
                      <div style={{ 
                        width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                        background: mon.status === 'up' ? 'var(--green-400)' : mon.status === 'down' ? 'var(--red-400)' : 'var(--saffron-400)' 
                      }} />
                      <div style={{ flex: 1, overflow: 'hidden' }}>
                        <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--white-100)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                          {mon.name}
                        </div>
                        <div style={{ fontSize: 10.5, color: 'var(--white-50)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                          {mon.target} &bull; {mon.type}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddSingleMonitor(mon);
                        }}
                        style={{
                          background: isAlreadyOnMap ? 'rgba(56, 189, 248, 0.1)' : 'var(--navy-800)',
                          border: '1px solid var(--navy-600)',
                          color: isAlreadyOnMap ? '#38bdf8' : 'var(--white-70)',
                          borderRadius: 6,
                          padding: '4px 8px',
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 3,
                          flexShrink: 0
                        }}
                        title={isAlreadyOnMap ? 'Device already placed (Click to add duplicate)' : 'Click to add to canvas'}
                      >
                        {isAlreadyOnMap ? <Check size={12} /> : <Plus size={12} />}
                        <span>{isAlreadyOnMap ? 'Added' : 'Add'}</span>
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Interactive ReactFlow Canvas */}
        <div style={{ flex: 1, position: 'relative' }} ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes} 
            edges={edges} 
            onNodesChange={onNodesChange} 
            onEdgesChange={onEdgesChange} 
            onConnect={onConnect}
            onInit={setReactFlowInstance} 
            onDrop={onDrop} 
            onDragOver={onDragOver} 
            onNodeClick={handleNodeClick}
            onEdgeClick={onEdgeClick} 
            onNodeContextMenu={onNodeContextMenu}
            nodeTypes={nodeTypes} 
            edgeTypes={edgeTypes} 
            fitView
            style={{ background: '#070f1e' }}
            colorMode="dark"
          >
            <Controls style={{ background: 'var(--navy-800)', border: '1px solid var(--navy-600)', fill: 'var(--white-100)' }} />
            <Background color="#13233c" gap={26} size={1.8} />
            <MiniMap 
              nodeColor={(n) => {
                const isUp = n.data?.status === 'UP';
                const isDegraded = n.data?.status === 'DEGRADE' || n.data?.status === 'WARNING';
                return isUp ? '#10B981' : isDegraded ? '#F97316' : '#EF4444';
              }}
              maskColor="rgba(7, 15, 30, 0.75)"
              style={{ background: 'var(--navy-800)', border: '1px solid var(--navy-600)', borderRadius: '8px' }}
            />
            
            {/* Top Right NOC Health HUD widget (Desktop) */}
            <Panel position="top-right" className="map-top-health-panel" style={{ display: 'flex', gap: '12px', marginTop: '16px', marginRight: '16px' }}>
              <div style={{
                background: 'rgba(13, 22, 38, 0.88)',
                backdropFilter: 'blur(10px)',
                border: '1px solid var(--navy-border)',
                borderRadius: '12px',
                padding: '14px 18px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                color: 'var(--white-100)'
              }}>
                <div style={{ 
                  background: healthPercent === 100 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)', 
                  padding: '9px', borderRadius: '50%', 
                  color: healthPercent === 100 ? 'var(--green-400)' : 'var(--red-400)' 
                }}>
                  {healthPercent === 100 ? <ShieldCheck size={22} /> : <ShieldAlert size={22} />}
                </div>
                <div>
                  <div style={{ fontSize: '10.5px', color: 'var(--white-60)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Topology Health</div>
                  <div style={{ fontSize: '19px', fontWeight: 800, color: healthPercent === 100 ? 'var(--green-400)' : 'var(--red-400)' }}>{healthPercent}%</div>
                </div>
              </div>

              <div style={{
                background: 'rgba(13, 22, 38, 0.88)',
                backdropFilter: 'blur(10px)',
                border: '1px solid var(--navy-border)',
                borderRadius: '12px',
                padding: '14px 18px',
                display: 'flex',
                gap: '20px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                color: 'var(--white-100)'
              }}>
                <div>
                  <div style={{ fontSize: '10.5px', color: 'var(--white-60)', fontWeight: 600, textTransform: 'uppercase' }}>Devices</div>
                  <div style={{ fontSize: '17px', fontWeight: 700 }}>{totalNodes}</div>
                </div>
                <div>
                  <div style={{ fontSize: '10.5px', color: 'var(--white-60)', fontWeight: 600, textTransform: 'uppercase' }}>Offline</div>
                  <div style={{ fontSize: '17px', fontWeight: 700, color: downNodes > 0 ? 'var(--red-400)' : 'var(--white-100)' }}>{downNodes}</div>
                </div>
                <div>
                  <div style={{ fontSize: '10.5px', color: 'var(--white-60)', fontWeight: 600, textTransform: 'uppercase' }}>Links</div>
                  <div style={{ fontSize: '17px', fontWeight: 700, color: '#38bdf8' }}>{edges.length}</div>
                </div>
              </div>
            </Panel>
          </ReactFlow>

          {/* Floating Mobile Bottom Dock */}
          <div className="map-mobile-dock">
            <button 
              className="map-mobile-dock-btn" 
              onClick={() => setIsSidebarOpen(true)}
            >
              <Plus size={15} color="#38bdf8" /> Devices
            </button>
            <button 
              className="map-mobile-dock-btn" 
              onClick={() => handleAutoLayout('TB')}
            >
              <LayoutGrid size={15} /> Layout
            </button>
            <button 
              className={`map-mobile-dock-btn${isTrafficMode ? ' active' : ''}`} 
              onClick={() => setIsTrafficMode(!isTrafficMode)}
            >
              <Zap size={15} /> Traffic
            </button>
            <button 
              className="map-mobile-dock-btn" 
              onClick={() => reactFlowInstance?.fitView({ padding: 0.2, duration: 400 })}
            >
              <Maximize2 size={15} /> Fit
            </button>
            <button 
              className="map-mobile-dock-btn active" 
              onClick={handleSave} 
              disabled={isSaving}
            >
              <Save size={15} /> Save
            </button>
          </div>
        </div>

        {/* Node Properties & Quick Diagnostics Drawer (Desktop & Mobile Bottom Sheet) */}
        {isPropertiesOpen && selectedNode && (
          <div className="map-prop-drawer">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Server size={18} color="#38bdf8" />
                <h3 style={{ margin: 0, fontSize: 16, color: 'var(--white-100)' }}>Device Properties</h3>
              </div>
              <button 
                onClick={() => setIsPropertiesOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--white-60)', cursor: 'pointer', padding: 4 }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Device Quick Status Card */}
              <div style={{ 
                background: 'var(--navy-900)', 
                border: '1px solid var(--navy-700)', 
                borderRadius: 10, 
                padding: '12px 14px', 
                display: 'flex', 
                flexDirection: 'column', 
                gap: 6 
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc' }}>{activeNode?.data?.label}</span>
                  <span style={{ 
                    fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
                    background: activeNode?.data?.status === 'UP' ? 'var(--green-500)' : 'var(--red-500)',
                    color: '#fff'
                  }}>
                    {activeNode?.data?.status || 'UNKNOWN'}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--white-60)', fontFamily: 'var(--font-mono)' }}>
                  Target: {activeNode?.data?.host || 'N/A'}
                </div>
                <div style={{ fontSize: 11, color: '#38bdf8', marginTop: 2 }}>
                  Latency: {activeNode?.data?.latency ? `${activeNode.data.latency} ms` : 'Live active'}
                </div>
              </div>

              {/* Edit Label Input */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--white-60)', marginBottom: '4px' }}>Topology Label</label>
                <input 
                  type="text" 
                  value={activeNode?.data?.label || ''} 
                  onChange={(e) => setNodes(nds => nds.map(n => n.id === activeNode.id ? { ...n, data: { ...n.data, label: e.target.value } } : n))} 
                  style={{ width: '100%', padding: '8px 10px', background: 'var(--navy-900)', border: '1px solid var(--navy-border)', color: 'var(--white-100)', borderRadius: '6px', outline: 'none', fontSize: 13 }} 
                />
              </div>

              {/* Touch Connection Helper Button */}
              <button 
                className="btn btn-secondary btn-sm" 
                onClick={() => {
                  setCableConnectSource(activeNode);
                  setIsPropertiesOpen(false);
                  toast.info(`Tap target device to connect from ${activeNode.data?.label}`);
                }}
                style={{ width: '100%', justifyContent: 'center', gap: 6, padding: '9px 12px', fontSize: 12.5 }}
              >
                <Link2 size={15} color="#38bdf8" /> Connect Cable to Another Device
              </button>

              {/* Quick Ping Diagnostic Test */}
              <div style={{ borderTop: '1px solid var(--navy-700)', paddingTop: 14 }}>
                <button 
                  className="btn btn-ghost btn-sm" 
                  onClick={() => handleQuickPing(activeNode?.data?.host || activeNode?.data?.label)}
                  disabled={isQuickPinging}
                  style={{ width: '100%', justifyContent: 'center', gap: 6, fontSize: 12 }}
                >
                  <Activity size={14} color="#10b981" /> {isQuickPinging ? 'Pinging Target...' : 'Run Quick Diagnostic Ping'}
                </button>

                {quickPingResult && (
                  <pre style={{
                    marginTop: 8, padding: 10, background: '#050a14', borderRadius: 6,
                    fontSize: 11, color: '#38bdf8', fontFamily: 'monospace', maxHeight: 110, overflowY: 'auto'
                  }}>
                    {quickPingResult}
                  </pre>
                )}
              </div>

              {/* Monitor Deep Link */}
              {activeNode?.data?.monitor_id && (
                <button 
                  className="btn btn-ghost btn-sm" 
                  onClick={() => navigate(`/monitors/${activeNode.data.monitor_id}`)}
                  style={{ width: '100%', justifyContent: 'center', gap: 6, fontSize: 12 }}
                >
                  <ExternalLink size={14} /> Open Monitor Dashboard
                </button>
              )}

              {/* Delete Node */}
              <button 
                onClick={deleteNode} 
                className="btn btn-sm"
                style={{ 
                  background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.35)', 
                  fontWeight: 600, marginTop: 10, justifyContent: 'center' 
                }}
              >
                Remove from Map
              </button>
            </div>
          </div>
        )}

        {/* Cable Properties Drawer (Desktop & Mobile Bottom Sheet) */}
        {isEdgeSettingsOpen && selectedEdge && (
          <div className="map-prop-drawer">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Zap size={18} color="#38bdf8" />
                <h3 style={{ margin: 0, fontSize: 16, color: 'var(--white-100)' }}>Cable Properties</h3>
              </div>
              <button 
                onClick={() => setIsEdgeSettingsOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--white-60)', cursor: 'pointer', padding: 4 }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--white-60)', marginBottom: '4px' }}>Edge Label</label>
                <input 
                  type="text" 
                  value={activeEdge?.data?.label || ''} 
                  onChange={(e) => setEdges(eds => eds.map(edge => edge.id === activeEdge.id ? { ...edge, data: { ...edge.data, label: e.target.value } } : edge))} 
                  style={{ width: '100%', padding: '8px', background: 'var(--navy-900)', border: '1px solid var(--navy-border)', color: 'var(--white-100)', borderRadius: '6px', outline: 'none' }} 
                  placeholder="e.g. Core Fiber Trunk" 
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--white-60)', marginBottom: '4px' }}>Link Capacity (Preset)</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 8 }}>
                  {[100, 1000, 10000].map(cap => (
                    <button
                      key={cap}
                      type="button"
                      className={`chip${activeEdge?.data?.capacity === cap ? ' active' : ''}`}
                      onClick={() => setEdges(eds => eds.map(edge => edge.id === activeEdge.id ? { ...edge, data: { ...edge.data, capacity: cap } } : edge))}
                      style={{ justifyContent: 'center', fontSize: 11 }}
                    >
                      {cap >= 1000 ? `${cap / 1000} Gbps` : `${cap} Mbps`}
                    </button>
                  ))}
                </div>
                <input 
                  type="number" 
                  value={activeEdge?.data?.capacity || 1000} 
                  onChange={(e) => setEdges(eds => eds.map(edge => edge.id === activeEdge.id ? { ...edge, data: { ...edge.data, capacity: Number(e.target.value) } } : edge))} 
                  style={{ width: '100%', padding: '8px', background: 'var(--navy-900)', border: '1px solid var(--navy-border)', color: 'var(--white-100)', borderRadius: '6px', outline: 'none' }} 
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--white-60)', marginBottom: '4px' }}>Line Style</label>
                <select 
                  value={activeEdge?.data?.lineStyle || 'solid'} 
                  onChange={(e) => setEdges(eds => eds.map(edge => edge.id === activeEdge.id ? { ...edge, data: { ...edge.data, lineStyle: e.target.value } } : edge))} 
                  style={{ width: '100%', padding: '8px', background: 'var(--navy-900)', border: '1px solid var(--navy-border)', color: 'var(--white-100)', borderRadius: '6px', outline: 'none' }}
                >
                  <option value="solid">Solid (High Capacity)</option>
                  <option value="dashed">Dashed (Standard)</option>
                  <option value="dotted">Dotted (Secondary / Backup)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--white-60)', marginBottom: '4px' }}>Associated Monitor</label>
                <select 
                  value={activeEdge?.data?.monitor_id || ''} 
                  onChange={(e) => setEdges(eds => eds.map(edge => edge.id === activeEdge.id ? { ...edge, data: { ...edge.data, monitor_id: e.target.value } } : edge))} 
                  style={{ width: '100%', padding: '8px', background: 'var(--navy-900)', border: '1px solid var(--navy-border)', color: 'var(--white-100)', borderRadius: '6px', outline: 'none' }}
                >
                  <option value="">None</option>
                  {monitors.map(m => (
                    <option key={m.id} value={m.id}>{m.name} ({m.target})</option>
                  ))}
                </select>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: 'var(--white-100)', marginTop: 4 }}>
                <input 
                  type="checkbox" 
                  checked={activeEdge?.data?.show_traffic ?? true} 
                  onChange={(e) => setEdges(eds => eds.map(edge => edge.id === activeEdge.id ? { ...edge, data: { ...edge.data, show_traffic: e.target.checked, isTrafficMode: e.target.checked } } : edge))} 
                  style={{ accentColor: '#38bdf8' }}
                />
                Show Live Flowing Traffic Animation
              </label>

              <button 
                onClick={deleteEdge} 
                className="btn btn-sm"
                style={{ padding: '8px', background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.35)', fontWeight: 600, marginTop: '10px', justifyContent: 'center' }}
              >
                Disconnect Cable
              </button>
            </div>
          </div>
        )}

        {/* Right-Click Context Menu */}
        {contextMenu && (
          <div style={{
            position: 'absolute', top: contextMenu.y - 20, left: contextMenu.x, zIndex: 1000,
            background: 'var(--navy-800)', border: '1px solid var(--navy-border)',
            boxShadow: '0 10px 25px rgba(0,0,0,0.6)', borderRadius: '8px', overflow: 'hidden', minWidth: '160px'
          }}>
            <div 
              style={{ padding: '8px 12px', color: 'var(--white-100)', cursor: 'pointer', borderBottom: '1px solid var(--navy-border)', fontSize: '13px' }} 
              onClick={() => { setSelectedNode(contextMenu.node); setIsPropertiesOpen(true); setIsEdgeSettingsOpen(false); setContextMenu(null); }}
            >
              Device Properties
            </div>
            <div 
              style={{ padding: '8px 12px', color: 'var(--white-100)', cursor: 'pointer', borderBottom: '1px solid var(--navy-border)', fontSize: '13px' }} 
              onClick={() => { handleQuickPing(contextMenu.node.data?.host || contextMenu.node.data?.label); setContextMenu(null); }}
            >
              Quick Ping
            </div>
            <div 
              style={{ padding: '8px 12px', color: 'var(--white-100)', cursor: 'pointer', borderBottom: '1px solid var(--navy-border)', fontSize: '13px' }} 
              onClick={() => { setCableConnectSource(contextMenu.node); setContextMenu(null); toast.info('Tap another device to connect'); }}
            >
              Connect Cable
            </div>
            <div 
              style={{ padding: '8px 12px', color: 'var(--red-500)', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }} 
              onClick={() => { setNodes(nds => nds.filter(n => n.id !== contextMenu.id)); setContextMenu(null); toast.info('Node removed'); }}
            >
              Remove Device
            </div>
          </div>
        )}

        {/* NOC Terminal Drawer */}
        {isTerminalOpen && (
          <div style={{
            position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)',
            width: '92%', maxWidth: '800px', height: '230px', backgroundColor: '#050a14',
            borderTop: '1px solid var(--navy-border)', borderLeft: '1px solid var(--navy-border)', borderRight: '1px solid var(--navy-border)',
            borderTopLeftRadius: '16px', borderTopRightRadius: '16px', zIndex: 100, display: 'flex', flexDirection: 'column',
            boxShadow: '0 -10px 30px rgba(0,0,0,0.7)'
          }}>
            <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--navy-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#38bdf8' }} />
                <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#38bdf8', letterSpacing: '1px' }}>[ NOC DIAGNOSTIC TERMINAL ]</span>
              </div>
              <X size={15} style={{ cursor: 'pointer', color: 'var(--white-100)' }} onClick={() => setIsTerminalOpen(false)} />
            </div>
            <div style={{ flex: 1, padding: '14px', color: 'var(--white-100)', fontFamily: 'monospace', fontSize: '12.5px', overflowY: 'auto' }}>
              {terminalHistory.map((item, idx) => (
                <div key={idx} style={{ marginBottom: '6px' }}>
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
                  Executing network command...
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px' }}>
                <span style={{ color: 'var(--green-500)' }}>$</span>
                <input 
                  type="text" 
                  placeholder="Enter command (e.g. ping 1.1.1.1 or traceroute 8.8.8.8)"
                  disabled={isTerminalLoading}
                  style={{ 
                    flex: 1, background: 'transparent', border: 'none', color: 'var(--white-100)', 
                    outline: 'none', fontFamily: 'monospace', fontSize: '12.5px'
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
                          setTerminalHistory([...newHistory, { type: 'error', text: `Command not recognized or missing target: ${command}. Try 'ping 8.8.8.8'` }]);
                          setIsTerminalLoading(false);
                          return;
                        }
                        setTerminalHistory([...newHistory, { type: 'output', text: res.data.output || 'Command completed.' }]);
                      } catch (err) {
                        setTerminalHistory([...newHistory, { type: 'error', text: `Execution error: ${err.message}` }]);
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

        {/* Exit NOC Wallboard Button */}
        {isWallboardMode && (
          <button 
            onClick={toggleWallboardMode}
            className="btn btn-primary btn-sm"
            style={{ position: 'fixed', top: 16, right: 16, zIndex: 10000, gap: 6, boxShadow: '0 4px 15px rgba(0,0,0,0.6)' }}
          >
            <Minimize2 size={14} /> Exit Wallboard
          </button>
        )}
      </div>

      {isDiscoveryOpen && <NetworkDiscoveryModal isOpen={isDiscoveryOpen} onClose={() => setIsDiscoveryOpen(false)} />}
    </div>
  );
}
