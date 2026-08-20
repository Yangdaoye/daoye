import { useEffect } from 'react'
import { useMissionStore } from '../store/missionStore'

const KEY_STEP = 0.55

/**
 * Keyboard + mouse-drag gesture control for the virtual arm end-effector.
 * WASD / arrows: horizontal · R/F: up/down · G: toggle gesture drag · Space: scan
 */
export function useArmControls(enabled = true) {
  useEffect(() => {
    if (!enabled) return

    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'BUTTON') return

      const state = useMissionStore.getState()
      const [x, y, z] = state.armTarget
      let next: [number, number, number] | null = null

      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          next = [x, y, z - KEY_STEP]
          break
        case 'KeyS':
        case 'ArrowDown':
          next = [x, y, z + KEY_STEP]
          break
        case 'KeyA':
        case 'ArrowLeft':
          next = [x - KEY_STEP, y, z]
          break
        case 'KeyD':
        case 'ArrowRight':
          next = [x + KEY_STEP, y, z]
          break
        case 'KeyR':
          next = [x, y + KEY_STEP * 0.6, z]
          break
        case 'KeyF':
          next = [x, y - KEY_STEP * 0.6, z]
          break
        case 'KeyG':
          state.setGestureEnabled(!state.gestureEnabled)
          break
        case 'Space':
          e.preventDefault()
          state.beginScan()
          break
        case 'KeyQ':
          state.collectSample()
          break
        case 'KeyE':
          state.stowArm()
          break
        case 'Digit1':
          state.setViewMode('orbit')
          break
        case 'Digit2':
          state.setViewMode('arm')
          break
        case 'Digit3':
          state.setViewMode('overview')
          break
        default:
          break
      }

      if (next) {
        e.preventDefault()
        state.setArmTarget(next)
        state.setArmMode('reach')
      }
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [enabled])
}

export function useGestureDrag(surface: HTMLElement | null) {
  useEffect(() => {
    if (!surface) return

    let dragging = false
    let lastX = 0
    let lastY = 0

    const onDown = (e: PointerEvent) => {
      if (!useMissionStore.getState().gestureEnabled) return
      if ((e.target as HTMLElement).closest('.hud-panel, .control-bar, button, a')) return
      dragging = true
      lastX = e.clientX
      lastY = e.clientY
      surface.setPointerCapture(e.pointerId)
    }

    const onMove = (e: PointerEvent) => {
      if (!dragging) return
      const dx = e.clientX - lastX
      const dy = e.clientY - lastY
      lastX = e.clientX
      lastY = e.clientY
      const [x, y, z] = useMissionStore.getState().armTarget
      useMissionStore.getState().setArmTarget([
        x + dx * 0.045,
        y - dy * 0.035,
        z,
      ])
      useMissionStore.getState().setArmMode('reach')
    }

    const onUp = (e: PointerEvent) => {
      dragging = false
      try {
        surface.releasePointerCapture(e.pointerId)
      } catch {
        /* ignore */
      }
    }

    surface.addEventListener('pointerdown', onDown)
    surface.addEventListener('pointermove', onMove)
    surface.addEventListener('pointerup', onUp)
    return () => {
      surface.removeEventListener('pointerdown', onDown)
      surface.removeEventListener('pointermove', onMove)
      surface.removeEventListener('pointerup', onUp)
    }
  }, [surface])
}
