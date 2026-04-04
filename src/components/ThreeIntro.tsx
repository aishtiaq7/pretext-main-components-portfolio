import { useEffect, useRef } from 'react'
import * as THREE from 'three'

export function ThreeIntro() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // 1. Scene — the world. Everything you want to render goes in here.
    const scene = new THREE.Scene()

    // 2. Camera — your eyes. PerspectiveCamera mimics how human vision works:
    //    - 50: field of view (degrees) — how wide you can see
    //    - aspect ratio — matches the container so things don't stretch
    //    - 0.1, 100: near/far clipping planes — anything closer than 0.1 or farther than 100 is invisible
    const camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 100)
    camera.position.z = 4 // pull camera back so we can see the origin

    // 3. Renderer — draws the scene from the camera's point of view onto a <canvas>.
    //    This is where WebGL (or WebGPU) actually happens.
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(container.clientWidth, container.clientHeight)
    renderer.setPixelRatio(window.devicePixelRatio)
    container.appendChild(renderer.domElement)

    // 4. Geometry — the shape. A box is 6 faces, 12 triangles, 8 vertices.
    //    Three.js gives you primitives (box, sphere, plane, etc.) so you
    //    don't have to define triangles by hand.
    const geometry = new THREE.BoxGeometry(1.4, 1.4, 1.4)

    // 5. Material — the surface. How light interacts with the shape.
    //    MeshStandardMaterial responds to lights (unlike MeshBasicMaterial which ignores them).
    const material = new THREE.MeshStandardMaterial({
      color: 0xc4a35a,     // golden, matching the project's accent
      roughness: 0.35,     // 0 = mirror, 1 = chalk
      metalness: 0.6,      // 0 = plastic, 1 = metal
    })

    // 6. Mesh = geometry + material. This is the actual object in the scene.
    const cube = new THREE.Mesh(geometry, material)
    scene.add(cube)

    // 7. Lights — without these, MeshStandardMaterial renders pure black.
    //    Think of it like a real room: no light = you see nothing.
    const ambient = new THREE.AmbientLight(0xffffff, 0.4)  // soft everywhere light
    const point = new THREE.PointLight(0xffffff, 1.2)      // bright spot, like a lamp
    point.position.set(3, 3, 3)
    scene.add(ambient, point)

    // 8. Animation loop — runs every frame (~60fps).
    //    Each frame: rotate the cube slightly, then render.
    let raf = 0
    function animate() {
      cube.rotation.x += 0.008
      cube.rotation.y += 0.012
      renderer.render(scene, camera) // draws one frame
      raf = requestAnimationFrame(animate)
    }
    raf = requestAnimationFrame(animate)

    // Handle resize
    function onResize() {
      if (!container) return
      const w = container.clientWidth
      const h = container.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix() // must call after changing aspect
      renderer.setSize(w, h)
    }
    window.addEventListener('resize', onResize)

    // Cleanup on unmount
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
      renderer.dispose()
      geometry.dispose()
      material.dispose()
      container.removeChild(renderer.domElement)
    }
  }, [])

  return (
    <section className="three-section">
      <div ref={containerRef} className="three-container" />
    </section>
  )
}
