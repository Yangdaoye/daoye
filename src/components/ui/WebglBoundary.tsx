import { Component, type ReactNode } from 'react'
import { useAppUi } from '../../store/appUi'

type Props = { children: ReactNode }

type State = { error: Error | null }

export class WebglBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch() {
    useAppUi.getState().markWebglFailed()
  }

  render() {
    if (this.state.error) {
      return (
        <div className="webgl-fallback">
          <h2>三维场景无法启动</h2>
          <p>当前浏览器 WebGL 不可用或渲染失败，请改用平面地图网页版。</p>
          <button type="button" className="btn" onClick={() => useAppUi.getState().enterSim('sim-map')}>
            打开平面地图版
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
