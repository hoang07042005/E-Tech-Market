describe('localStorage debug', () => {
  it('reports localStorage shape', () => {
    console.log('localStorage', typeof localStorage, localStorage)
    console.log('window.localStorage', typeof window.localStorage, window.localStorage)
    console.log('clear exists', typeof localStorage.clear)
    expect(typeof localStorage.clear).toBe('function')
  })
})
