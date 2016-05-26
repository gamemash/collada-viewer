var XML2JS = require('xml2js');


let findID = function(obj){
  let urls = {}
  switch(typeof(obj)){

    case 'object':
      for (let a in obj){
        if (a == "$" && obj.$.id){
          urls["#" + obj.$.id] = obj;
        }
        urls = Object.assign(urls, findID(obj[a]));
      };
      break;
  }
  return urls;
}

let linkURLS = function(obj, urls){
  switch(typeof(obj)){

    case 'object':
      for (let a in obj){
        if (a == "url"){
          obj.link = urls[obj.url];
        }
        linkURLS(obj[a], urls);
      };
      break;
  }

  return obj;
}


module.exports =  {
  interpret: function(xml){
    let data;
    XML2JS.parseString(xml, function (err, result) {
      data = result;
    });
    let urls = findID(data);
    return linkURLS(data, urls);
  }
}

