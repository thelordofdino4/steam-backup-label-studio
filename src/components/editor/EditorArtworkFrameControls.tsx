import {
  ADDITIONAL_ARTWORK_FRAME_JAGGEDNESS_MAX,
  ADDITIONAL_ARTWORK_FRAME_JAGGEDNESS_MIN,
  ADDITIONAL_ARTWORK_FRAME_LUMPINESS_MAX,
  ADDITIONAL_ARTWORK_FRAME_LUMPINESS_MIN,
  ADDITIONAL_ARTWORK_FRAME_METAL_BEVEL_WIDTH_MAX,
  ADDITIONAL_ARTWORK_FRAME_METAL_BEVEL_WIDTH_MIN,
  ADDITIONAL_ARTWORK_FRAME_METAL_BRUSH_ANGLE_MAX,
  ADDITIONAL_ARTWORK_FRAME_METAL_BRUSH_ANGLE_MIN,
  ADDITIONAL_ARTWORK_FRAME_METAL_DEPTH_MAX,
  ADDITIONAL_ARTWORK_FRAME_METAL_DEPTH_MIN,
  ADDITIONAL_ARTWORK_FRAME_METAL_PATTERN_SCALE_MAX,
  ADDITIONAL_ARTWORK_FRAME_METAL_PATTERN_SCALE_MIN,
  ADDITIONAL_ARTWORK_FRAME_METAL_PATTERN_STRENGTH_MAX,
  ADDITIONAL_ARTWORK_FRAME_METAL_PATTERN_STRENGTH_MIN,
  ADDITIONAL_ARTWORK_FRAME_METAL_POLISH_MAX,
  ADDITIONAL_ARTWORK_FRAME_METAL_POLISH_MIN,
  ADDITIONAL_ARTWORK_FRAME_METAL_TARNISH_MAX,
  ADDITIONAL_ARTWORK_FRAME_METAL_TARNISH_MIN,
  ADDITIONAL_ARTWORK_FRAME_ROUGHNESS_OFFSET_MAX,
  ADDITIONAL_ARTWORK_FRAME_ROUGHNESS_OFFSET_MIN,
  ADDITIONAL_ARTWORK_FRAME_WIDTH_MAX,
  ADDITIONAL_ARTWORK_FRAME_WIDTH_MIN,
  type AdditionalArtworkFrameField,
} from '../../project/additionalArtworkFrame.ts'
import type { AdditionalArtworkFrame } from '../../project/projectTypes'
import { EditorRangeField } from './EditorRangeField'
import { OptionalFeatureSection } from './OptionalFeatureSection'

export type EditorArtworkFrameControlsProps = {
  frame: AdditionalArtworkFrame
  idPrefix: string
  onFrameChange: (
    field: AdditionalArtworkFrameField,
    value: boolean | number | string,
  ) => void
  onResetFrame: () => void
}

export function EditorArtworkFrameControls({
  frame,
  idPrefix,
  onFrameChange,
  onResetFrame,
}: EditorArtworkFrameControlsProps) {
  return (
    <OptionalFeatureSection
      className="additional-artwork-frame-controls"
      contentClassName="editor-control-grid"
      enabled={frame.enabled}
      enableLabel="Show border/frame"
      onEnabledChange={(enabled) => onFrameChange('enabled', enabled)}
      actions={(
        <button
          className="secondary-button"
          type="button"
          onClick={onResetFrame}
        >
          Reset frame
        </button>
      )}
    >
      <label>
        <span>Style</span>
        <select
          value={frame.style}
          onChange={(event) => onFrameChange('style', event.target.value)}
        >
          <option value="solid">Solid color</option>
          <option value="rocky">Rocky texture</option>
          <option value="metal">Metal</option>
        </select>
      </label>

      <label>
        <span>Shape</span>
        <select
          value={frame.shape}
          onChange={(event) => onFrameChange('shape', event.target.value)}
        >
          <option value="rectangle">Rectangle</option>
          <option value="circle">Circle / oval</option>
        </select>
      </label>

      {frame.style === 'solid' ? (
        <label>
          <span>Color</span>
          <input
            type="color"
            value={frame.color}
            onChange={(event) => onFrameChange('color', event.target.value)}
          />
        </label>
      ) : null}

      <EditorRangeField
        id={`${idPrefix}-frame-width`}
        label="Width"
        min={ADDITIONAL_ARTWORK_FRAME_WIDTH_MIN}
        max={ADDITIONAL_ARTWORK_FRAME_WIDTH_MAX}
        step={0.25}
        value={frame.width}
        onInput={(value) => onFrameChange('width', value)}
        onChange={(value) => onFrameChange('width', value)}
      />

      {frame.style === 'rocky' ? (
        <>
          <EditorRangeField
            id={`${idPrefix}-frame-lumpiness`}
            label="Lumpiness"
            min={ADDITIONAL_ARTWORK_FRAME_LUMPINESS_MIN}
            max={ADDITIONAL_ARTWORK_FRAME_LUMPINESS_MAX}
            step={1}
            value={frame.lumpiness}
            onInput={(value) => onFrameChange('lumpiness', value)}
            onChange={(value) => onFrameChange('lumpiness', value)}
          />

          <EditorRangeField
            id={`${idPrefix}-frame-jaggedness`}
            label="Jaggedness"
            min={ADDITIONAL_ARTWORK_FRAME_JAGGEDNESS_MIN}
            max={ADDITIONAL_ARTWORK_FRAME_JAGGEDNESS_MAX}
            step={1}
            value={frame.jaggedness}
            onInput={(value) => onFrameChange('jaggedness', value)}
            onChange={(value) => onFrameChange('jaggedness', value)}
          />

          <EditorRangeField
            id={`${idPrefix}-frame-roughness-offset`}
            label="Bump position"
            min={ADDITIONAL_ARTWORK_FRAME_ROUGHNESS_OFFSET_MIN}
            max={ADDITIONAL_ARTWORK_FRAME_ROUGHNESS_OFFSET_MAX}
            step={1}
            value={frame.roughnessOffset}
            onInput={(value) => onFrameChange('roughnessOffset', value)}
            onChange={(value) => onFrameChange('roughnessOffset', value)}
          />
        </>
      ) : null}

      {frame.style === 'metal' ? (
        <>
          <label>
            <span>Metal</span>
            <select
              value={frame.metalType}
              onChange={(event) => onFrameChange('metalType', event.target.value)}
            >
              <option value="steel">Steel</option>
              <option value="chrome">Chrome</option>
              <option value="gunmetal">Gunmetal</option>
              <option value="brass">Brass</option>
              <option value="bronze">Bronze</option>
              <option value="gold">Gold</option>
              <option value="copper">Copper</option>
              <option value="blackIron">Black iron</option>
            </select>
          </label>

          <label>
            <span>Profile</span>
            <select
              value={frame.metalProfile}
              onChange={(event) => onFrameChange('metalProfile', event.target.value)}
            >
              <option value="flat">Flat</option>
              <option value="raised">Raised bevel</option>
              <option value="inset">Inset bevel</option>
              <option value="double">Double bevel</option>
              <option value="rounded">Rounded molding</option>
              <option value="stepped">Stepped molding</option>
            </select>
          </label>

          <label>
            <span>Pattern</span>
            <select
              value={frame.metalPattern}
              onChange={(event) => onFrameChange('metalPattern', event.target.value)}
            >
              <option value="none">None</option>
              <option value="rivets">Rivets</option>
              <option value="engraved">Engraved lines</option>
              <option value="hammered">Hammered</option>
              <option value="brushed">Brushed</option>
            </select>
          </label>

          <EditorRangeField
            id={`${idPrefix}-frame-metal-depth`}
            label="Molding depth"
            min={ADDITIONAL_ARTWORK_FRAME_METAL_DEPTH_MIN}
            max={ADDITIONAL_ARTWORK_FRAME_METAL_DEPTH_MAX}
            step={1}
            value={frame.metalDepth}
            onInput={(value) => onFrameChange('metalDepth', value)}
            onChange={(value) => onFrameChange('metalDepth', value)}
          />

          <EditorRangeField
            id={`${idPrefix}-frame-metal-bevel-width`}
            label="Bevel width"
            min={ADDITIONAL_ARTWORK_FRAME_METAL_BEVEL_WIDTH_MIN}
            max={ADDITIONAL_ARTWORK_FRAME_METAL_BEVEL_WIDTH_MAX}
            step={1}
            value={frame.metalBevelWidth}
            onInput={(value) => onFrameChange('metalBevelWidth', value)}
            onChange={(value) => onFrameChange('metalBevelWidth', value)}
          />

          <EditorRangeField
            id={`${idPrefix}-frame-metal-brush-angle`}
            label="Brush angle"
            min={ADDITIONAL_ARTWORK_FRAME_METAL_BRUSH_ANGLE_MIN}
            max={ADDITIONAL_ARTWORK_FRAME_METAL_BRUSH_ANGLE_MAX}
            step={1}
            value={frame.metalBrushAngle}
            onInput={(value) => onFrameChange('metalBrushAngle', value)}
            onChange={(value) => onFrameChange('metalBrushAngle', value)}
          />

          <EditorRangeField
            id={`${idPrefix}-frame-metal-polish`}
            label="Polish"
            min={ADDITIONAL_ARTWORK_FRAME_METAL_POLISH_MIN}
            max={ADDITIONAL_ARTWORK_FRAME_METAL_POLISH_MAX}
            step={1}
            value={frame.metalPolish}
            onInput={(value) => onFrameChange('metalPolish', value)}
            onChange={(value) => onFrameChange('metalPolish', value)}
          />

          <EditorRangeField
            id={`${idPrefix}-frame-metal-tarnish`}
            label="Tarnish"
            min={ADDITIONAL_ARTWORK_FRAME_METAL_TARNISH_MIN}
            max={ADDITIONAL_ARTWORK_FRAME_METAL_TARNISH_MAX}
            step={1}
            value={frame.metalTarnish}
            onInput={(value) => onFrameChange('metalTarnish', value)}
            onChange={(value) => onFrameChange('metalTarnish', value)}
          />

          {frame.metalPattern !== 'none' ? (
            <>
              <EditorRangeField
                id={`${idPrefix}-frame-metal-pattern-scale`}
                label="Pattern scale"
                min={ADDITIONAL_ARTWORK_FRAME_METAL_PATTERN_SCALE_MIN}
                max={ADDITIONAL_ARTWORK_FRAME_METAL_PATTERN_SCALE_MAX}
                step={1}
                value={frame.metalPatternScale}
                onInput={(value) => onFrameChange('metalPatternScale', value)}
                onChange={(value) => onFrameChange('metalPatternScale', value)}
              />

              <EditorRangeField
                id={`${idPrefix}-frame-metal-pattern-strength`}
                label="Pattern strength"
                min={ADDITIONAL_ARTWORK_FRAME_METAL_PATTERN_STRENGTH_MIN}
                max={ADDITIONAL_ARTWORK_FRAME_METAL_PATTERN_STRENGTH_MAX}
                step={1}
                value={frame.metalPatternStrength}
                onInput={(value) => onFrameChange('metalPatternStrength', value)}
                onChange={(value) => onFrameChange('metalPatternStrength', value)}
              />
            </>
          ) : null}
        </>
      ) : null}
    </OptionalFeatureSection>
  )
}
