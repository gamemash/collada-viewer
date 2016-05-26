let THREE = require('three');
var XMLLinker = require('./xml_linker.js');

ColladaLoader = {
  createModel: function(data){
    var geometry = new THREE.BufferGeometry();
    geometry.setIndex( new THREE.BufferAttribute( data.indices, 1 ) );
    geometry.addAttribute( 'position', new THREE.BufferAttribute( data.position, 3 ) );
    geometry.addAttribute( 'normal', new THREE.BufferAttribute( data.normal, 3, true ) );
    geometry.addAttribute( 'color', new THREE.BufferAttribute( data.color, 3, true ) );
    geometry.computeBoundingSphere();
    var material = new THREE.MeshPhongMaterial( {
      color: 0xaaaaaa,
      specular: 0xffffff, shininess: 250,
      vertexColors: THREE.VertexColors
    });
    
    mesh = new THREE.Mesh( geometry, material );
    //mesh.matrix.elements.set(data.matrix.toArray());
    let matrixData = data.matrix.toArray();
    mesh.matrix = data.matrix.clone();
    mesh.matrixAutoUpdate = false;
    return mesh;
  },
  loadModelSource: function(modelName){
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
  },
  getMaterials: function(collada){
    let materials =  {};
    let effects = collada.library_effects[0].effect;
    collada.library_materials[0].material.forEach(function(material){
      let effect = material.instance_effect[0].$.link;
      let color = effect.profile_COMMON[0].technique[0].lambert[0].diffuse[0].color[0].split(" ").map(function(value) { return parseFloat(value); });
      materials["#" + material.$.id] = color;
    });
    return materials;
  },
  getMatrix: function(matrixString){
    let matrix = new THREE.Matrix4();
    let data = matrixString.split(" ").map(function(value) {
      return parseFloat(value); 
    });
    matrix.set( data[ 0], data[ 1], data[ 2], data[ 3], data[ 4], data[ 5], data[ 6], data[ 7], data[ 8], data[ 9], data[10], data[11], data[12], data[13], data[14], data[15]);
    return matrix;
  },
  load: function(filename){
    return new Promise(function(resolve){
      ColladaLoader.loadModelSource(filename).then(function(xml){
        let colladaModel = new THREE.Scene();
        let models = ColladaLoader.interpretData(xml);
        models.forEach(function(data){
          colladaModel.add(ColladaLoader.createModel(data));
        });
        resolve(colladaModel);
      });
    });
  },
  interpretNode: function(data, node, materials, parentMatrix){
    let matrix = this.getMatrix(node.matrix[0]);
    if (parentMatrix){
      matrix.multiply(parentMatrix);
    }
    let instance_geometries = node.instance_node[0].$.link.instance_geometry;
    let geometries = instance_geometries.map(function(instanceGeometry){
      let geometryData = {};
      let materialID = instanceGeometry.bind_material[0].technique_common[0].instance_material[0].$.target;
      let material = materials[materialID];
      let geometry = instanceGeometry.$.link;
      let mesh = geometry.mesh[0];

      let triangle = mesh.triangles[0];
      //var indices = new Uint32Array( triangles * 3 );
      let indices = new Uint32Array(triangle.$.count * 3);
      i = 0;
      triangle.p[0].split(" ").forEach(function(index) {
        indices[i] = parseInt(index);
        i += 1;
      });
      geometryData.indices = indices;

      let verticesInfo = triangle.input[0].$.link;
      verticesInfo.input.forEach(function(input){
        let type = input.$.semantic.toLowerCase();
        let source = input.$.link;
        let sourceData = new Float32Array(source.float_array[0].$.count);
        let i = 0;
        source.float_array[0]._.split(" ").forEach(function(value) {
          sourceData[i] = parseFloat(value);
          i += 1;
        });
        geometryData[type] = sourceData;
      });

      let colors = new Float32Array(geometryData.position.length);
      let thisColor = materials[materialID];
      for (var x = 0; x < colors.length; x += 3){
        colors[x]     = material[0];
        colors[x + 1] = material[1];
        colors[x + 2] = material[2];
      }
      geometryData.color = colors;
      geometryData.matrix = matrix;

      return geometryData;
    });
    if (node.instance_node[0].$.link.node){ // if subnodes...
      node.instance_node[0].$.link.node.forEach(function(subNode){
        geometries = geometries.concat(ColladaLoader.interpretNode(data, subNode, materials, matrix));
      });
    }

    return geometries;
  },
  interpretData: function(xml){
    let models = [];
    let data = XMLLinker.interpret(xml).COLLADA;

    let materials = this.getMaterials(data);
    let visual_scene = data.scene[0].instance_visual_scene[0].$.link;
    let node = visual_scene.node[0].node.find(function(node){
      return node.$.name == "instance_0";
    });
    let geometries = this.interpretNode(data, node, materials);

    return geometries;
  }

};
module.exports = ColladaLoader;

