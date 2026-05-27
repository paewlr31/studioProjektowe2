import React, { useEffect, useRef, useCallback } from 'react'
import * as d3 from 'd3'

const TYPE_COLORS = {
  cooperative: '#22d3ee',
  selfish: '#f59e0b',
  troll: '#ef4444',
  neutral: '#6b7280',
}

const COMMUNITY_PALETTE = [
  '#6366f1', '#22d3ee', '#f59e0b', '#a855f7',
  '#10b981', '#f43f5e', '#3b82f6', '#84cc16',
]

// Persist positions between renders
const positionCache = new Map()

const OPINION_GRADIENT = (val) => {
  if (val === undefined || val === null) return '#6b7280'
  const t = (val + 1) / 2
  const r = Math.round(239 * (1 - t) + 34 * t)
  const g = Math.round(68 * (1 - t) + 211 * t)
  const b = Math.round(68 * (1 - t) + 238 * t)
  return `rgb(${r}, ${g}, ${b})`
}

export default function ForceGraph({ nodes = [], edges = [], width = 600, height = 500, colorBy = 'type', opinionMap = {}, selectedTopic = null }) {
  const svgRef = useRef(null)
  const simRef = useRef(null)
  const tooltipRef = useRef(null)

  const getColor = useCallback((node) => {
    if (colorBy === 'community') {
      return COMMUNITY_PALETTE[node.community % COMMUNITY_PALETTE.length] || '#6366f1'
    }
    if (colorBy === 'opinion') {
      const opinions = opinionMap[node.id]
      if (opinions && selectedTopic && opinions[selectedTopic]) {
        return OPINION_GRADIENT(opinions[selectedTopic].value)
      }
      return '#6b7280'
    }
    return TYPE_COLORS[node.type] || '#6b7280'
  }, [colorBy, opinionMap, selectedTopic])

  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    // Tooltip
    let tooltip = d3.select(tooltipRef.current)

    // Defs (arrow markers)
    const defs = svg.append('defs')
    defs.append('marker')
      .attr('id', 'arrow')
      .attr('viewBox', '0 -4 8 8')
      .attr('refX', 20)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-4L8,0L0,4')
      .attr('fill', '#3f3f5a')

    const container = svg.append('g')

    // Zoom
    svg.call(
      d3.zoom()
        .scaleExtent([0.3, 3])
        .on('zoom', (e) => container.attr('transform', e.transform))
    )

    // Build D3 data — reuse cached positions for smooth updates
    const nodeMap = new Map(nodes.map(n => [n.id, { ...n }]))
    const links = edges
      .filter(e => nodeMap.has(e.source) && nodeMap.has(e.target))
      .map(e => ({ ...e }))

    const nodeData = [...nodeMap.values()].map(n => {
      const cached = positionCache.get(n.id)
      return cached ? { ...n, x: cached.x, y: cached.y } : { ...n }
    })

    // Simulation
    const sim = d3.forceSimulation(nodeData)
      .force('link', d3.forceLink(links).id(d => d.id).distance(60).strength(0.3))
      .force('charge', d3.forceManyBody().strength(-180))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide(18))

    simRef.current = sim

    // Edges
    const link = container.append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', '#2a2a3e')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', d => Math.min(Math.sqrt(d.weight || 1) * 1.2, 4))
      .attr('marker-end', 'url(#arrow)')

    // Node groups
    const node = container.append('g')
      .selectAll('g')
      .data(nodeData)
      .join('g')
      .attr('cursor', 'pointer')
      .call(
        d3.drag()
          .on('start', (e, d) => { if (!e.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y })
          .on('drag', (e, d) => { d.fx = e.x; d.fy = e.y })
          .on('end', (e, d) => { if (!e.active) sim.alphaTarget(0); d.fx = null; d.fy = null })
      )

    // Node circles
    node.append('circle')
      .attr('r', d => 7 + Math.min((d.degree || 0) * 1.5, 10))
      .attr('fill', d => getColor(d))
      .attr('fill-opacity', 0.85)
      .attr('stroke', d => getColor(d))
      .attr('stroke-width', 1.5)
      .attr('stroke-opacity', 0.4)

    // Glow circle (larger, transparent)
    node.append('circle')
      .attr('r', d => 12 + Math.min((d.degree || 0) * 1.5, 10))
      .attr('fill', 'none')
      .attr('stroke', d => getColor(d))
      .attr('stroke-width', 0.5)
      .attr('stroke-opacity', 0.15)

    // Labels
    node.append('text')
      .text(d => d.name || d.id.slice(0, 4))
      .attr('dy', d => -(10 + Math.min((d.degree || 0) * 1.5, 10)))
      .attr('text-anchor', 'middle')
      .attr('font-size', 9)
      .attr('font-family', 'JetBrains Mono, monospace')
      .attr('fill', '#7c7c9a')
      .attr('pointer-events', 'none')

    // Reputation indicator
    node.append('text')
      .text(d => d.reputation)
      .attr('dy', 3)
      .attr('text-anchor', 'middle')
      .attr('font-size', 7)
      .attr('font-family', 'JetBrains Mono, monospace')
      .attr('fill', '#e2e2f0')
      .attr('font-weight', '600')
      .attr('pointer-events', 'none')

    // Tooltip interactions
    node
      .on('mouseover', (e, d) => {
        const opinions = opinionMap[d.id]
        let opinionHtml = ''
        if (opinions && selectedTopic && opinions[selectedTopic]) {
          const o = opinions[selectedTopic]
          opinionHtml = `<div>Opinia: <span style="color:${OPINION_GRADIENT(o.value)}">${o.value.toFixed(2)}</span> (pewność: ${o.confidence.toFixed(2)})</div>`
        }
        tooltip
          .style('opacity', 1)
          .html(`
            <div style="color:#6366f1;font-weight:600;margin-bottom:4px">${d.name}</div>
            <div>Type: <span style="color:${getColor(d)}">${d.type}</span></div>
            <div>Reputation: <span style="color:#e2e2f0">${d.reputation}</span></div>
            <div>Degree: ${d.degree || 0}</div>
            <div>Community: ${d.community ?? '—'}</div>
            ${opinionHtml}
          `)
      })
      .on('mousemove', (e) => {
        tooltip
          .style('left', (e.offsetX + 12) + 'px')
          .style('top', (e.offsetY - 10) + 'px')
      })
      .on('mouseout', () => tooltip.style('opacity', 0))

    // Tick — update positions and save to cache
    sim.on('tick', () => {
      link
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y)
      node.attr('transform', d => {
        positionCache.set(d.id, { x: d.x, y: d.y })
        return `translate(${d.x},${d.y})`
      })
    })

    return () => sim.stop()
  }, [nodes, edges, width, height, colorBy, getColor, opinionMap, selectedTopic])

  return (
    <div className="relative w-full h-full" style={{ background: '#0d0d14' }}>
      <svg ref={svgRef} width={width} height={height} className="w-full h-full" />
      <div
        ref={tooltipRef}
        className="graph-tooltip"
        style={{ opacity: 0, transition: 'opacity 0.15s' }}
      />
    </div>
  )
}
