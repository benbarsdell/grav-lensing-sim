
function createFloatBuffer(gl, data, itemSize, flags) {
  if( flags == null ) {
    flags = gl.STATIC_DRAW;
  }
  buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER,
                new Float32Array(data),
                flags);
  buffer.itemSize = itemSize;
  buffer.numItems = data.length / itemSize;
  return buffer;
}

function setFloatBuffer(gl, buffer, data, itemSize, flags) {
  if( flags == null ) {
    flags = gl.STATIC_DRAW;
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER,
                new Float32Array(data),
                flags);
  buffer.itemSize = itemSize;
  buffer.numItems = data.length / itemSize;
  return buffer;
}
/*
function createIndexBuffer(gl, data, itemSize, flags) {
  if( flags == null ) {
    flags = gl.STATIC_DRAW;
  }
  buffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,
                new Uint16Array(data),
                flags);
  buffer.itemSize = itemSize;
  buffer.numItems = data.length / itemSize;
  return buffer;
}
*/
function createFloatTexture(gl, pixels, w, h) {
  texture = gl.createTexture();
  texture.width = w;
  texture.height = h;
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  if( pixels != null ) {
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, w, h, 0,
                  gl.RGB, gl.FLOAT, new Float32Array(pixels));
  }
  else {
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, w, h, 0,
                  gl.RGB, gl.FLOAT, null);
  }
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
  return texture;
}

function createFrameBuffer(gl, texture) {
  fbo = gl.createFramebuffer();
  fbo.width = texture.width;
  fbo.height = texture.height;
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0,
                          gl.TEXTURE_2D, texture, 0);
  return fbo;
}
