let THREE = require('three');

var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera( 75, window.innerWidth/window.innerHeight, 0.1, 1000 );
var ColladaLoader = require('./src/collada_loader.js');

var renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );


scene.add( new THREE.AmbientLight( 0x444444 ) );

var light1 = new THREE.DirectionalLight( 0xffffff, 0.5 );
light1.position.set( 1, 1, 1 );
scene.add( light1 );

var light2 = new THREE.DirectionalLight( 0xffffff, 1.5 );
light2.position.set( 0, -1, 0 );
scene.add( light2 );
console.log(scene);



ColladaLoader.load("cup.dae").then(function(colladaModel){
  colladaModel.rotation.x -= Math.PI / 2
  scene.add(colladaModel);
});

var gridHelper = new THREE.GridHelper( 10, 1 );
scene.add( gridHelper );
camera.position.y += 1;

let angle = 0;
let radius = 10;

var render = function () {
  requestAnimationFrame( render );

  camera.position.x = Math.sin(angle) * radius;
  camera.position.z = Math.cos(angle) * radius;
  angle += 0.01 ;
  camera.lookAt(new THREE.Vector3(0, 0, 0));
  renderer.render(scene, camera);
};

render();

