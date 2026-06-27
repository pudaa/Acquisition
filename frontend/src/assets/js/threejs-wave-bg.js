// threejs-wave-bg.js
// three.js 点阵波浪动画封装模块
import * as THREE from 'https://cdn.bootcdn.net/ajax/libs/three.js/0.152.2/three.module.min.js';

export function createWaveBackground(container, options = {}) {
    // 点阵横向间距（像素）
    const SEPARATION = options.separation || 100;
    // 点阵横向点数
    const AMOUNTX = options.amountX || 50;
    // 点阵纵向点数
    const AMOUNTY = options.amountY || 50;
    // 点阵颜色（十六进制）
    const COLOR = options.color || 0xEAEAEA;
    // 相机基础Y坐标（影响整体上下位置）
    const BASE_Y = options.baseY || 1000;
    // 波浪振幅（影响波动高度）
    const AMPLITUDE = options.amplitude || 60;
    // 点的缩放系数（影响点大小）
    const SCALE = options.scale || 10;

    // three.js 场景相关变量
    let camera, scene, renderer, particles, count = 0;
    // 鼠标位置
    let mouseX = 0, mouseY = 0;
    // 屏幕中心点
    let windowHalfX = window.innerWidth / 2;
    let windowHalfY = window.innerHeight / 2;

    // 顶点着色器
    const vertexShader = `
        attribute float scale;
        void main() {
            vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
            gl_PointSize = scale * ( 300.0 / - mvPosition.z );
            gl_Position = projectionMatrix * mvPosition;
        }
    `;
    // 片元着色器
    const fragmentShader = `
        uniform vec3 color;
        void main() {
            if ( length( gl_PointCoord - vec2( 0.5, 0.5 ) ) > 0.475 ) discard;
            gl_FragColor = vec4( color, 1.0 );
        }
    `;

    function init() {
        camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 1, 10000 );
        camera.position.z = 1000;
        camera.position.y = 1000;
        scene = new THREE.Scene();
        // 点阵数据
        const numParticles = AMOUNTX * AMOUNTY;
        const positions = new Float32Array( numParticles * 3 );
        const scales = new Float32Array( numParticles );
        let i = 0, j = 0;
        for ( let ix = 0; ix < AMOUNTX; ix ++ ) {
            for ( let iy = 0; iy < AMOUNTY; iy ++ ) {
                positions[ i ] = ix * SEPARATION - ( ( AMOUNTX * SEPARATION ) / 2 );
                positions[ i + 1 ] = 0;
                positions[ i + 2 ] = iy * SEPARATION - ( ( AMOUNTY * SEPARATION ) / 2 );
                scales[ j ] = 1;
                i += 3;
                j ++;
            }
        }
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute( 'position', new THREE.BufferAttribute( positions, 3 ) );
        geometry.setAttribute( 'scale', new THREE.BufferAttribute( scales, 1 ) );
        const material = new THREE.ShaderMaterial( {
            uniforms: {
                color: { value: new THREE.Color( COLOR ) },
            },
            vertexShader,
            fragmentShader
        } );
        particles = new THREE.Points( geometry, material );
        scene.background = null;
        scene.add( particles );
        renderer = new THREE.WebGLRenderer( { antialias: true, alpha: true } );
        renderer.setPixelRatio( window.devicePixelRatio );
        renderer.setSize( window.innerWidth, window.innerHeight );
        // 添加样式类
        renderer.domElement.classList.add('wave-bg-canvas');
        container.appendChild( renderer.domElement );
        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('resize', onWindowResize);
        animate();
    }
    function onWindowResize() {
        windowHalfX = window.innerWidth / 2;
        windowHalfY = window.innerHeight / 2;
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize( window.innerWidth, window.innerHeight );
    }
    function onPointerMove( event ) {
        if ( event.isPrimary === false ) return;
        mouseX = event.clientX - windowHalfX;
        mouseY = event.clientY - windowHalfY;
    }
    function animate() {
        requestAnimationFrame( animate );
        render();
    }
    function render() {
        camera.position.x += ( mouseX - camera.position.x ) * .05;
        camera.position.y += ( BASE_Y - mouseY - camera.position.y ) * .05;
        camera.lookAt( scene.position );
        const positions = particles.geometry.attributes.position.array;
        const scales = particles.geometry.attributes.scale.array;
        let i = 0, j = 0;
        for ( let ix = 0; ix < AMOUNTX; ix ++ ) {
            for ( let iy = 0; iy < AMOUNTY; iy ++ ) {
                positions[ i + 1 ] = ( Math.sin( ( ix + count ) * 0.3 ) * AMPLITUDE ) +
                                ( Math.sin( ( iy + count ) * 0.5 ) * AMPLITUDE );
                scales[ j ] = ( Math.sin( ( ix + count ) * 0.3 ) + 1 ) * SCALE +
                                ( Math.sin( ( iy + count ) * 0.5 ) + 1 ) * SCALE;
                i += 3;
                j ++;
            }
        }
        particles.geometry.attributes.position.needsUpdate = true;
        particles.geometry.attributes.scale.needsUpdate = true;
        renderer.render( scene, camera );
        count += 0.05;
    }
    init();
    // 返回渲染器和场景等，便于后续控制
    return {
        renderer,
        scene,
        camera,
        particles,
        // 销毁方法，移除canvas和事件监听
        dispose() {
            if (renderer && renderer.domElement && renderer.domElement.parentNode) {
                renderer.domElement.parentNode.removeChild(renderer.domElement);
            }
            renderer.dispose();
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('resize', onWindowResize);
        }
    };
}
