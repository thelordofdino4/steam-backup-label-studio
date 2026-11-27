import assert from 'node:assert/strict'
import test from 'node:test'
import { COMMAND_BUSY_SCOPES } from '../lifecycle/applicationCommandTypes.ts'
import { applicationHelpCapability } from './applicationHelpCapability.ts'

test('Help blocks application/native dialog phases without treating nonmodal jobs as modal ownership', () => {
  assert.equal(applicationHelpCapability(true, []).canExecute, false)
  assert.equal(applicationHelpCapability(false, []).canExecute, true)
  for (const scope of COMMAND_BUSY_SCOPES) {
    assert.equal(applicationHelpCapability(false, [scope]).canExecute, !scope.startsWith('dialog.'), scope)
  }
})
