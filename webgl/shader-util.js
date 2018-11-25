
//function buildShader(gl, type, src) {
//  var shader;
//  if (type == "x-shader/x-fragment") {
//    shader = gl.createShader(gl.FRAGMENT_SHADER);
//  } else if (type == "x-shader/x-vertex") {
//    shader = gl.createShader(gl.VERTEX_SHADER);
//  } else {
//    return null;
//  }
//  gl.shaderSource(shader, str);
//  gl.compileShader(shader);
//  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
//    alert(gl.getShaderInfoLog(shader));
//    return null;
//  }
//  return shader;
//}

function getShader(gl, id) {
  var shaderScript = document.getElementById(id);
  if (!shaderScript) {
    alert("Could not find element '" + id + "'");
    return null;
  }
  var str = "";
  var k = shaderScript.firstChild;
  while (k) {
    if (k.nodeType == 3) {
      str += k.textContent;
    }
    k = k.nextSibling;
  }
  if (str == "") {
    var xhr = new XMLHttpRequest();
    // TODO: async=false is deprecated
    xhr.open("GET", shaderScript.src, false);
    xhr.onreadystatechange = function () {
      if(xhr.readyState === XMLHttpRequest.DONE && xhr.status === 200) {
        str = xhr.responseText;
      }
    };
    xhr.send();
  }

  var shader;
  if (shaderScript.type == "x-shader/x-fragment") {
    shader = gl.createShader(gl.FRAGMENT_SHADER);
  } else if (shaderScript.type == "x-shader/x-vertex") {
    shader = gl.createShader(gl.VERTEX_SHADER);
  } else {
    return null;
  }

  gl.shaderSource(shader, str);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    alert(gl.getShaderInfoLog(shader));
    return null;
  }
  return shader;
}

function buildShaderProgram(gl, shader_names) {
  //Promise.all(shader_names
  //            .map(id => getShader(gl, id))
  //            .forEach(shader => gl.attachShader(shaderProgram, shader)));
  var shaderProgram = gl.createProgram();
  for( i in shader_names ) {
    var shader = getShader(gl, shader_names[i]);
    gl.attachShader(shaderProgram, shader);
  }
  gl.linkProgram(shaderProgram);
  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    alert("Could not initialise shaders");
  }
  gl.useProgram(shaderProgram);
  return shaderProgram;
}
