import React, { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'

const NODE_COLORS = {
  query: '#58a6ff',
  sub_question: '#d29922',
  finding: '#3fb950',
  analysis: '#bc8cff',
  source: '#8b949e',
  session: '#f0883e',
  unknown: '#6e7681',
}

const NODE_SIZES = {
  query: 10,
  sub_question: 7,
  finding: 5,
  analysis: 8,
  source: 4,
  session: 12,
}

export default function KnowledgeGraph({ data = { nodes: [], edges: [] }, width = 600, height = 400 }) {
  const svgRef = useRef(null)
  const [selectedNode, setSelectedNode] = useState(null)
  const [tooltip, setTooltip] = useState(null)

  useEffect(() => {
    if (!svgRef.current || !data.nodes.length) return

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const g = svg.append('g')

    // Zoom behavior
    const zoom = d3.zoom()
      .scaleExtent([0.2, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform)
      })
    svg.call(zoom)

    // Build simulation
    const simulation = d3.forceSimulation(data.nodes)
      .force('link', d3.forceLink(data.edges).id(d => d.id).distance(80))
      .force('charge', d3.forceManyBody().strength(-150))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(20))

    // Draw links
    const link = g.append('g')
      .selectAll('line')
      .data(data.edges)
      .join('line')
      .attr('stroke', '#30363d')
      .attr('stroke-width', 1.5)
      .attr('stroke-opacity', 0.6)

    // Draw nodes
    const node = g.append('g')
      .selectAll('g')
      .data(data.nodes)
      .join('g')
      .call(d3.drag()
        .on('start', (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart()
          d.fx = d.x
          d.fy = d.y
        })
        .on('drag', (event, d) => {
          d.fx = event.x
          d.fy = event.y
        })
        .on('end', (event, d) => {
          if (!event.active) simulation.alphaTarget(0)
          d.fx = null
          d.fy = null
        })
      )

    node.append('circle')
      .attr('r', d => NODE_SIZES[d.type] || 5)
      .attr('fill', d => NODE_COLORS[d.type] || '#6e7681')
      .attr('stroke', '#0d1117')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        event.stopPropagation()
        setSelectedNode(d)
      })
      .on('mouseenter', (event, d) => {
        setTooltip({ x: event.offsetX, y: event.offsetY, text: d.label })
      })
      .on('mouseleave', () => {
        setTooltip(null)
      })

    node.append('text')
      .text(d => d.label.length > 20 ? d.label.slice(0, 20) + '…' : d.label)
      .attr('x', d => NODE_SIZES[d.type] + 5 || 8)
      .attr('y', 4)
      .attr('fill', '#8b949e')
      .attr('font-size', '10px')
      .attr('font-family', 'system-ui, sans-serif')

    // Simulation tick
    simulation.on('tick', () => {
      link
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y)

      node.attr('transform', d => `translate(${d.x},${d.y})`)
    })

    // Center view on initial render
    const initialTransform = d3.zoomIdentity.translate(0, 0).scale(1)
    svg.call(zoom.transform, initialTransform)

    return () => {
      simulation.stop()
    }
  }, [data, width, height])

  if (!data.nodes.length) {
    return (
      <div className="flex items-center justify-center h-full text-center" style={{ height }}>
        <div>
          <p className="text-sm text-text-muted">No knowledge graph data yet</p>
          <p className="text-xs text-text-muted mt-1">Research queries will build the graph over time</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative graph-container" style={{ width, height }}>
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="bg-surface"
      />
      {tooltip && (
        <div
          className="absolute z-10 px-2 py-1 bg-surface-raised border border-surface-border rounded text-xs text-text-primary pointer-events-none shadow-lg"
          style={{ left: tooltip.x + 10, top: tooltip.y - 10 }}
        >
          {tooltip.text}
        </div>
      )}
      {selectedNode && (
        <div className="absolute bottom-4 left-4 right-4 bg-surface-raised border border-surface-border rounded-lg p-3 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text-primary">{selectedNode.label}</p>
              <p className="text-xs text-text-muted mt-0.5">Type: {selectedNode.type}</p>
            </div>
            <button
              onClick={() => setSelectedNode(null)}
              className="text-xs text-text-muted hover:text-text-secondary"
            >
              Close
            </button>
          </div>
        </div>
      )}
      {/* Legend */}
      <div className="absolute top-3 right-3 bg-surface-raised/90 border border-surface-border rounded-lg p-2 text-xs space-y-1 backdrop-blur-sm">
        {Object.entries(NODE_COLORS).map(([type, color]) => (
          <div key={type} className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-text-muted">{type.replace('_', ' ')}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
