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

let colladaModel = new THREE.Scene();

let createModel = function(indices, vertices, normals, colors, matrix){
  var geometry = new THREE.BufferGeometry();
  geometry.setIndex( new THREE.BufferAttribute( indices, 1 ) );
  geometry.addAttribute( 'position', new THREE.BufferAttribute( vertices, 3 ) );
  geometry.addAttribute( 'normal', new THREE.BufferAttribute( normals, 3, true ) );
  geometry.addAttribute( 'color', new THREE.BufferAttribute( colors, 3, true ) );
  geometry.computeBoundingSphere();
  var material = new THREE.MeshPhongMaterial( {
    color: 0xaaaaaa,
    specular: 0xffffff, shininess: 250,
    vertexColors: THREE.VertexColors
  });
  
  mesh = new THREE.Mesh( geometry, material );
  mesh.matrix.autoUpdate = false;
  mesh.matrix = matrix;
  colladaModel.add(mesh);
}

scene.add( new THREE.AmbientLight( 0x444444 ) );

var light1 = new THREE.DirectionalLight( 0xffffff, 0.5 );
light1.position.set( 1, 1, 1 );
scene.add( light1 );

var light2 = new THREE.DirectionalLight( 0xffffff, 1.5 );
light2.position.set( 0, -1, 0 );
scene.add( light2 );
console.log(scene);




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

      let visual_scene_id = "#" + result.COLLADA.library_nodes[0].node[0].$.id;
      let visual_scene = result.COLLADA.library_visual_scenes[0].visual_scene[0].node[0].node.find(function(node){
        if (node.instance_node){
          return node.instance_node[0].$.url == visual_scene_id;
        }
      });
      let i = 0;
      let data = visual_scene.matrix[0].split(" ").map(function(value) {
        return parseFloat(value); 
      });
      let matrix = new THREE.Matrix4().fromArray(data);
      let materialID = instanceGeometry.bind_material[0].technique_common[0].instance_material[0].$.target;
      mesh.triangles.forEach(function(triangle){
        let verticesSource = triangle.input[0].$.source;
        //var indices = new Uint32Array( triangles * 3 );
        let indices = new Uint32Array(triangle.$.count * 3);
        i = 0;
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
        let colors = new Float32Array(vertices.length);

        let thisColor = materials[materialID];
        for (var x = 0; x < colors.length; x += 3){
          colors[x]     = thisColor[0];
          colors[x + 1] = thisColor[1];
          colors[x + 2] = thisColor[2];
        }
        i = 0;
        source.float_array[0]._.split(" ").forEach(function(value) {
          vertices[i] = parseFloat(value);
          i += 1;
        });

        let normalInfo = verticesList.input.find(function(normalInfo){
          return normalInfo.$.semantic == "NORMAL";
        })
        source = mesh.source.find(function(source){
          return ("#" + source.$.id) == normalInfo.$.source;
        });

        let normals = new Float32Array(source.float_array[0].$.count);
        i = 0;
        source.float_array[0]._.split(" ").forEach(function(value) {
          normals[i] = parseFloat(value);
          i += 1;
        });
        //let normals = new Float32Array(source.float_array[0].$.count);
        createModel(indices, vertices, normals, colors, matrix);
      });
    });
  });


  scene.add(colladaModel);
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

colladaModel.rotation.x -= Math.PI / 2
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

  //scene.children.forEach(function(mesh){
  //  mesh.rotation.z += 0.01;
  //});

  renderer.render(scene, camera);
};

render();

