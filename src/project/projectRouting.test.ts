import assert from 'node:assert/strict'
import test from 'node:test'
import { resolveSavedProjectRoute } from './projectRouting.ts'

test('routes current explicit disc projects to the disc editor', () => {
  assert.deepEqual(
    resolveSavedProjectRoute({
      projectType: 'disc',
      template: { type: 'disc', variant: 'standardPrintableDisc' },
    }),
    {
      projectType: 'disc',
      workspace: 'disc',
    },
  )
})

test('routes legacy disc projects by template type', () => {
  assert.deepEqual(
    resolveSavedProjectRoute({
      template: { type: 'disc', variant: 'standardPrintableDisc' },
    }),
    {
      projectType: 'disc',
      workspace: 'disc',
    },
  )
})

test('routes future case insert projects by explicit project type', () => {
  assert.deepEqual(
    resolveSavedProjectRoute({
      projectType: 'caseInsert',
      template: { type: 'jewelCase' },
    }),
    {
      projectType: 'caseInsert',
      workspace: 'caseInsert',
    },
  )
})

test('routes future case insert projects by editor metadata', () => {
  assert.deepEqual(
    resolveSavedProjectRoute({
      editor: { projectType: 'caseInsert' },
      template: { type: 'disc' },
    }),
    {
      projectType: 'caseInsert',
      workspace: 'caseInsert',
    },
  )
})

test('routes future case insert projects by case template type', () => {
  assert.deepEqual(
    resolveSavedProjectRoute({
      template: { type: 'jewelCase' },
    }),
    {
      projectType: 'caseInsert',
      workspace: 'caseInsert',
    },
  )
})
