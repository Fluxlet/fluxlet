
// # Register
//
// A really minimal ordered Map implementation using a raw JS object and array
// does not rely on an ES6 Map or polyfill
//
export default function() {
  const ordered = []
  const keyed = Object.create(null)
  return {
    set(name, value) {
      if (!keyed[name]) {
        ordered.push(name)
      }
      keyed[name] = value
    },
    get(name) {
      return keyed[name]
    },
    has(name) {
      return !!keyed[name]
    },
    forEach(iteratee) {
      ordered.forEach(name => iteratee(keyed[name], name))
    }
  }
}
