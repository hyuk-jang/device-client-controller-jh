

var _ = require('lodash');
var t = {a:1, b: () => null, c: () => undefined, d: () => yy};
var yy = {client: {on:true}, clients: {hi:{}}};

  
  
console.log('hi', _.chain(t.b()).get('client').isEmpty().value() );
console.log('hi', _.chain(t.c()).isEmpty().value());
console.log('hi', _.chain(t.d()).get('client.on').isEmpty().value() );
console.log('hi', _.chain(t.d()).get('clients.on').isEmpty().value() );