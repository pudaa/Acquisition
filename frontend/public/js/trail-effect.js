class TrailEffect {
  constructor(options = {}) {
    this.points = []
    this.paths = []
    this.svg = null
    this.animationId = null
    this.options = {
      maxPoints: 10,
      segmentCount: 20,
      fadeDuration: 500,
      ...options
    }
    this.init()
  }

  init() {
    // 创建SVG容器
    this.createSvgContainer()
    
    // 初始化渐变
    this.initGradient()
    
    // 绑定事件
    this.bindEvents()
    
    // 启动动画循环
    this.startAnimation()
  }

  createSvgContainer() {
    this.svg = document.getElementById('trail-svg')
    if (!this.svg) {
      this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
      this.svg.setAttribute('id', 'trail-svg')
      this.svg.style.cssText = 'position:fixed;left:0;top:0;pointer-events:none;z-index:9998;width:100vw;height:100vh'
      document.body.appendChild(this.svg)
    }
  }

  initGradient() {
    // 清除旧的渐变定义
    const oldDefs = this.svg.querySelector('defs')
    if (oldDefs) {
      this.svg.removeChild(oldDefs)
    }
    
    // 创建渐变
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs')
    const gradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient')
    gradient.setAttribute('id', 'trail-gradient')
    gradient.setAttribute('gradientUnits', 'userSpaceOnUse')
    gradient.setAttribute('x1', '0')
    gradient.setAttribute('y1', '0')
    gradient.setAttribute('x2', '0')
    gradient.setAttribute('y2', '0')
    
    // 渐变色设置简化，减少计算量
    const stops = [
      { offset: '0%', color: '#42a5f5', opacity: '0.95' },
      { offset: '60%', color: '#2196f3', opacity: '0.4' },
      { offset: '100%', color: '#2196f3', opacity: '0' }
    ]
    
    stops.forEach(stopConfig => {
      const stop = document.createElementNS('http://www.w3.org/2000/svg', 'stop')
      Object.entries(stopConfig).forEach(([key, value]) => {
        stop.setAttribute(key, value)
      })
      gradient.appendChild(stop)
    })
    
    defs.appendChild(gradient)
    this.svg.appendChild(defs)
  }

  bindEvents() {
    // 鼠标移动事件（添加节流）
    this.throttledMouseMove = this.throttle(this.handleMouseMove.bind(this), 16)
    document.addEventListener('mousemove', this.throttledMouseMove)
  }

  unbindEvents() {
    document.removeEventListener('mousemove', this.throttledMouseMove)
  }

  handleMouseMove(e) {
    this.points.push({ x: e.clientX, y: e.clientY })
    // 限制点的数量
    if (this.points.length > this.options.maxPoints) {
      this.points.shift()
    }
  }




  startAnimation() {
    let lastTime = 0
    const animate = () => {
      this.animationId = requestAnimationFrame(animate)
      
      // 限制绘制频率，提高性能
      const now = Date.now()
      if (now - lastTime < 30) return // 控制在大约33fps左右
      lastTime = now
      
      this.drawTrail()
      this.fadeTrail()
    }
    
    this.animationId = requestAnimationFrame(animate)
  }

  drawTrail() {
    if (!this.svg || this.points.length < 1) return // 修改为至少需要1个点
    
    // 批量更新路径
    const batchUpdate = () => {
      // 清除旧路径
      if (this.paths.length > 0) {
        this.paths.forEach(path => {
          if (path && this.svg.contains(path)) {
            this.svg.removeChild(path)
          }
        })
        this.paths = []
      }
      
      // 创建路径数据
      const pathData = this.buildPathData()
      
      // 如果没有路径数据，直接返回
      if (!pathData) return
      
      // 创建主路径
      const fullPath = document.createElementNS('http://www.w3.org/2000/svg', 'path')
      fullPath.setAttribute('d', pathData)
      fullPath.setAttribute('stroke', '#2196f3')
      fullPath.setAttribute('fill', 'none')
      fullPath.setAttribute('stroke-linecap', 'round')
      fullPath.setAttribute('stroke-linejoin', 'round')
      fullPath.setAttribute('stroke-width', 0) // 主路径不显示宽度
      this.svg.appendChild(fullPath)
      
      // 检查主路径是否有效
      try {
        const length = fullPath.getTotalLength();
        // 如果路径长度为0或者无效，不创建子路径
        if (length <= 0 || !isFinite(length)) {
          return;
        }
      } catch (e) {
        // 如果获取路径长度失败，不创建子路径
        return;
      }
      
      // 只有在有足够点的情况下才创建子路径
      if (this.points.length >= 2) {
        // 获取路径长度
        let length;
        try {
          length = fullPath.getTotalLength();
        } catch (e) {
          // console.error('Failed to get path length:', e);
          return;
        }
        
        // 创建子路径
        for (let i = 0; i < this.options.segmentCount; i++) {
          const start = (i / this.options.segmentCount) * length
          const end = ((i + 1) / this.options.segmentCount) * length
          
          try {
            const startPoint = fullPath.getPointAtLength(start)
            const endPoint = fullPath.getPointAtLength(end)
            
            if (!startPoint || !endPoint) continue
            
            // 创建子路径
            const subPath = document.createElementNS('http://www.w3.org/2000/svg', 'path')
            subPath.setAttribute('d', `M${startPoint.x},${startPoint.y} L${endPoint.x},${endPoint.y}`)
            
            // 计算透明度和宽度变化（头部最宽最不透明，末端收束渐隐）
            const t = i / (this.options.segmentCount - 1)
            // 鼠标处（头部）最宽，末端收束到0.5
            const width = - (6 * (1 - t)) + 6
            // 鼠标处（头部）最不透明，末端透明
            const opacity = 0.8 * Math.pow(t, 2)
            
            // 拖尾主色改为蓝色
            subPath.setAttribute('stroke', '#2196f3')
            subPath.setAttribute('stroke-width', width)
            subPath.setAttribute('opacity', opacity)
            subPath.setAttribute('fill', 'none')
            subPath.setAttribute('stroke-linecap', 'round')
            subPath.setAttribute('stroke-linejoin', 'round')
            
            this.svg.appendChild(subPath)
            this.paths.push(subPath)
          } catch (e) {
            // console.error('Error creating subpath:', e)
          }
        }
        
        // 更新渐变方向
        if (this.points.length > 1) {
          const gradient = this.svg.querySelector('#trail-gradient')
          if (gradient) {
            gradient.setAttribute('x1', this.points[this.points.length - 1].x)
            gradient.setAttribute('y1', this.points[this.points.length - 1].y)
            gradient.setAttribute('x2', this.points[0].x)
            gradient.setAttribute('y2', this.points[0].y)
          }
        }
      }
    }
    
    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(batchUpdate)
    } else {
      batchUpdate()
    }
  }

  buildPathData() {
    // 简化路径创建过程，使用二次贝塞尔曲线替代三次贝塞尔曲线
    if (!this.points || this.points.length === 0) {
      return '' // 如果没有点，返回空路径
    }
    
    let d = `M${this.points[0].x},${this.points[0].y}`
    
    for (let i = 0; i < this.points.length - 1; i++) {
      const midX = (this.points[i].x + this.points[i + 1].x) / 2
      const midY = (this.points[i].y + this.points[i + 1].y) / 2
      d += ` Q${this.points[i].x},${this.points[i].y} ${midX},${midY}`
    }
    
    return d
  }

  fadeTrail() {
    if (this.points.length > 1) {
      this.points.shift()
    } else if (this.points.length === 1) {
      this.points = []
    }
    // 清理路径
    this.paths.forEach(path => {
      if (path && this.svg.contains(path)) {
        this.svg.removeChild(path)
      }
    })
    this.paths = []
  }

  destroy() {
    this.unbindEvents()
    cancelAnimationFrame(this.animationId)
    
    // 清理SVG元素
    if (this.svg) {
      // 移除所有路径
      this.paths.forEach(path => {
        if (path && this.svg.contains(path)) {
          this.svg.removeChild(path)
        }
      })
      this.paths = []
      
      // 移除SVG容器
      if (this.svg.parentNode) {
        this.svg.parentNode.removeChild(this.svg)
      }
    }
  }

  // 工具方法：节流函数
  throttle(func, limit) {
    let inThrottle = false
    return (...args) => {
      if (!inThrottle) {
        func.apply(this, args)
        inThrottle = true
        setTimeout(() => inThrottle = false, limit)
      }
    }
  }

  // 工具方法：防抖函数
  debounce(func, delay) {
    let timeoutId
    return (...args) => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => func.apply(this, args), delay)
    }
  }
}

// 在window上暴露类
window.TrailEffect = TrailEffect