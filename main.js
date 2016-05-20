let THREE = require('three');

var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera( 75, window.innerWidth/window.innerHeight, 0.1, 1000 );

var renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );

var XML2JS = require('xml2js');
//var xml = "<root>Hello xml2js!</root>"
//parseString(xml, function (err, result) {
//    console.dir(result);
//});

var material = new THREE.MeshBasicMaterial( { color: 0xff0000 } );

function loadModelSource(modelName){
  return new Promise(function(resolve){
    var xhttp = new XMLHttpRequest();
      xhttp.onreadystatechange = (function(shaderLoader) {
      return function(){
        if (xhttp.readyState == 4 && xhttp.status == 200)
          resolve(xhttp.responseText);
      }
      })(this);
      xhttp.open("GET", "models/" + modelName, true);
      xhttp.send();
  });
}

let createModel = function(vertices, indices, color){
  var geometry = new THREE.BufferGeometry();
  geometry.setIndex( new THREE.BufferAttribute( indices, 1 ) );
  geometry.addAttribute( 'position', new THREE.BufferAttribute( vertices, 3 ) );
  geometry.computeBoundingSphere();
  var material = new THREE.MeshBasicMaterial( {
    color: new THREE.Color(color[0], color[1], color[2])
  });
  
  mesh = new THREE.Mesh( geometry, material );
  scene.add(mesh);
}

loadModelSource("xenics.dae").then(function(xml){
  XML2JS.parseString(xml, function (err, result) {
    let effects = result.COLLADA.library_effects[0].effect;
    let materials =  {};
    result.COLLADA.library_materials[0].material.forEach(function(material){
      let effectId = material.instance_effect[0].$.url;
      let effect = effects.find(function(effect){
        return ("#" + effect.$.id) == effectId
      });
      let color = effect.profile_COMMON[0].technique[0].lambert[0].diffuse[0].color[0].split(" ").map(function(value) { return parseFloat(value); });
      materials["#" + material.$.id] = color;
    });
    let geometries = result.COLLADA.library_geometries[0].geometry;
    let geometry = geometries[0];

    geometries.forEach(function(geometry){
      let mesh = geometry.mesh[0];

      let instanceGeometry = result.COLLADA.library_nodes[0].node[0].instance_geometry.find(function(instanceGeometry){
        return ("#" + geometry.$.id) == instanceGeometry.$.url;
      });
      let materialID = instanceGeometry.bind_material[0].technique_common[0].instance_material[0].$.target;
      mesh.triangles.forEach(function(triangle){
        let verticesSource = triangle.input[0].$.source;
        //var indices = new Uint32Array( triangles * 3 );
        let indices = new Uint32Array(triangle.$.count * 3);
        let i = 0;
        triangle.p[0].split(" ").forEach(function(index) {
          indices[i] = parseInt(index);
          i += 1;
        });

        let verticesList = mesh.vertices.find(function(vert){ return ("#" + vert.$.id) == verticesSource});
        let vertexInfo = verticesList.input.find(function(vertexInfo){
          return vertexInfo.$.semantic == "POSITION";
        })
        let source = mesh.source.find(function(source){
          return ("#" + source.$.id) == vertexInfo.$.source;
        });

        let vertices = new Float32Array(source.float_array[0].$.count);
        i = 0;
        source.float_array[0]._.split(" ").forEach(function(value) {
          vertices[i] = parseFloat(value);
          i += 1;
        });
        createModel(vertices, indices, materials[materialID]);
      });
    });
  });
});

var geometry = new THREE.BufferGeometry();
// create a simple square shape. We duplicate the top left and bottom right
// vertices because each vertex needs to appear once per triangle.
var vertices = new Float32Array( [
	-1.0, -1.0,  1.0,
	 1.0, -1.0,  1.0,
	 1.0,  1.0,  1.0,

	 1.0,  1.0,  1.0,
	-1.0,  1.0,  1.0,
	-1.0, -1.0,  1.0
] );

// itemSize = 3 because there are 3 values (components) per vertex
camera.position.z = 10;



var render = function () {
  requestAnimationFrame( render );

  scene.children.forEach(function(mesh){
    mesh.rotation.y += 0.1;
  });
  //camera.rotation.x += 0.1;
  //camera.rotation.y += 0.1;

  renderer.render(scene, camera);
};

render();

