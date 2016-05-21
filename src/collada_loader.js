let THREE = require('three');
var XML2JS = require('xml2js');


ColladaLoader = {
  createModel: function(data){
    var geometry = new THREE.BufferGeometry();
    geometry.setIndex( new THREE.BufferAttribute( data.indices, 1 ) );
    geometry.addAttribute( 'position', new THREE.BufferAttribute( data.vertices, 3 ) );
    geometry.addAttribute( 'normal', new THREE.BufferAttribute( data.normals, 3, true ) );
    geometry.addAttribute( 'color', new THREE.BufferAttribute( data.colors, 3, true ) );
    geometry.computeBoundingSphere();
    var material = new THREE.MeshPhongMaterial( {
      color: 0xaaaaaa,
      specular: 0xffffff, shininess: 250,
      vertexColors: THREE.VertexColors
    });
    
    mesh = new THREE.Mesh( geometry, material );
    mesh.matrix.autoUpdate = false;
    mesh.matrix = data.matrix;
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
      let effectId = material.instance_effect[0].$.url;
      let effect = effects.find(function(effect){
        return ("#" + effect.$.id) == effectId
      });
      let color = effect.profile_COMMON[0].technique[0].lambert[0].diffuse[0].color[0].split(" ").map(function(value) { return parseFloat(value); });
      materials["#" + material.$.id] = color;
    });
    return materials;
  },
  getMatrix: function(collada){
    let visual_scene_id = "#" + collada.library_nodes[0].node[0].$.id;
    let visual_scene = collada.library_visual_scenes[0].visual_scene[0].node[0].node.find(function(node){
      if (node.instance_node){
        return node.instance_node[0].$.url == visual_scene_id;
      }
    });
    let i = 0;
    let data = visual_scene.matrix[0].split(" ").map(function(value) {
      return parseFloat(value); 
    });
    return new THREE.Matrix4().fromArray(data);
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
  interpretData: function(xml){
    let models = [];
    XML2JS.parseString(xml, function (err, result) {
      let materials = ColladaLoader.getMaterials(result.COLLADA);

      let geometries = result.COLLADA.library_geometries[0].geometry;
      geometries.forEach(function(geometry){
        let mesh = geometry.mesh[0];

        let instanceGeometry = result.COLLADA.library_nodes[0].node[0].instance_geometry.find(function(instanceGeometry){
          return ("#" + geometry.$.id) == instanceGeometry.$.url;
        });
        let matrix = ColladaLoader.getMatrix(result.COLLADA);
        let materialID = instanceGeometry.bind_material[0].technique_common[0].instance_material[0].$.target;
        let triangle = mesh.triangles[0];
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
        models.push({
          indices: indices,
          vertices: vertices,
          normals: normals,
          colors: colors,
          matrix: matrix
        });
      });
    });
    return models;

  }

};
module.exports = ColladaLoader;

