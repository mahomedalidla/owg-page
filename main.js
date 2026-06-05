const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById('canvas-container').appendChild(renderer.domElement);

const ambientLight = new THREE.AmbientLight(0xff0000, 0.5);
scene.add(ambientLight);

const geometry = new THREE.CylinderGeometry(0.02, 0.02, 10);
const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
for(let i=0; i<3; i++) {
    const rope = new THREE.Mesh(geometry, material);
    rope.rotation.z = Math.PI / 2;
    rope.position.y = (i * 1.5) - 1.5;
    scene.add(rope);
}

camera.position.z = 5;

function animate() {
    requestAnimationFrame(animate);
    
    const pulse = Math.sin(Date.now() * 0.005) * 0.5 + 0.5;
    ambientLight.intensity = 0.5 + (pulse * 0.5);

    camera.position.x = Math.sin(Date.now() * 0.0005) * 0.5;
    camera.rotation.z = Math.sin(Date.now() * 0.001) * 0.02;
    
    renderer.render(scene, camera);
}
animate();