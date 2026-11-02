import { useState } from 'react'

export default function ApplicationStartupFixture() {
  const [failed, setFailed] = useState(false)
  Object.assign(window, { failFixture: () => setFailed(true) })
  if (failed) throw Error('private-render-cause')
  return 'Ready fixture'
}
