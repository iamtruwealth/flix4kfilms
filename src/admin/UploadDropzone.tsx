import { useCallback, useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import { validateUpload, uploadToBucket, localObjectUrl, buildUploadPath, type UploadFileKind } from './upload'

/**
 * Drag-and-drop upload surface for the admin room.
 *
 * Validates locally, uploads each file (resumable for large/video), shows
 * progress and error states, and hands the finished object paths back to the
 * caller via `onUploaded` — the DB record creation is the caller's next step,
 * so a failed upload never leaves a half-published item.
 */

interface UploadTask {
  id: string
  name: string
  kind: UploadFileKind
  state: 'validating' | 'uploading' | 'done' | 'error'
  progress: number
  error?: string
  /** Final storage object path (set when done). */
  path?: string
  /** Local preview URL while uploading. */
  preview?: string
}

export interface UploadedObject {
  path: string
  kind: UploadFileKind
  name: string
}

interface UploadDropzoneProps {
  bucket: 'portfolio-images' | 'portfolio-videos'
  categorySlug: string
  year: string
  onUploaded: (objects: UploadedObject[]) => void
}

let nextId = 0

export function UploadDropzone({
  bucket,
  categorySlug,
  year,
  onUploaded,
}: UploadDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [tasks, setTasks] = useState<UploadTask[]>([])
  const [dragging, setDragging] = useState(false)

  const patchTask = (id: string, patch: Partial<UploadTask>) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)))
  }

  const runUpload = useCallback(
    async (file: File) => {
      const id = `u-${nextId++}`
      const validation = validateUpload(file)
      if (!validation.ok) {
        setTasks((prev) => [
          ...prev,
          { id, name: file.name, kind: 'image', state: 'error', progress: 0, error: validation.error },
        ])
        return
      }

      const preview = bucket === 'portfolio-images' ? localObjectUrl(file) : undefined
      setTasks((prev) => [
        ...prev,
        { id, name: file.name, kind: validation.kind, state: 'uploading', progress: 0, preview },
      ])

      const finished: UploadedObject[] = []
      try {
        const path = buildUploadPath(validation.kind, categorySlug, year, file.name)
        await uploadToBucket({
          bucket,
          path,
          file,
          onProgress: (pct) => patchTask(id, { progress: pct }),
        })
        patchTask(id, { state: 'done', progress: 100, path })
        finished.push({ path, kind: validation.kind, name: file.name })
      } catch (err) {
        patchTask(id, {
          state: 'error',
          error: err instanceof Error ? err.message : 'Upload failed.',
        })
      }

      if (finished.length > 0) onUploaded(finished)
    },
    [bucket, categorySlug, year, onUploaded],
  )

  const onFiles = useCallback(
    (files: FileList | null) => {
      if (!files) return
      for (const file of Array.from(files)) {
        void runUpload(file)
      }
    },
    [runUpload],
  )

  const onInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    onFiles(e.target.files)
    e.target.value = ''
  }

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragging(false)
    onFiles(e.dataTransfer.files)
  }

  const retry = (task: UploadTask) => {
    setTasks((prev) => prev.filter((t) => t.id !== task.id))
    // Re-upload requires the file handle, which we don't keep — prompt instead.
    alert('Select the file again to retry.')
  }

  return (
    <div className="upload-zone">
      <div
        className={`dropzone${dragging ? ' dropzone-active' : ''}`}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click()
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept={
            bucket === 'portfolio-images'
              ? 'image/jpeg,image/png,image/webp'
              : 'video/mp4,video/webm,video/quicktime'
          }
          multiple
          onChange={onInputChange}
          hidden
        />
        <p className="dropzone-title">
          {dragging ? 'Drop to upload' : 'Drag files here, or click to browse'}
        </p>
        <p className="dropzone-hint">
          {bucket === 'portfolio-images'
            ? 'JPEG, PNG or WebP up to 25 MB'
            : 'MP4, WebM or MOV up to 2 GB (resumable)'}
        </p>
      </div>

      {tasks.length > 0 ? (
        <ul className="upload-tasks">
          {tasks.map((task) => (
            <li key={task.id} className={`upload-task upload-task-${task.state}`}>
              {task.preview ? <img className="upload-thumb" src={task.preview} alt="" /> : null}
              <div className="upload-task-main">
                <p className="upload-task-name">{task.name}</p>
                {task.state === 'uploading' ? (
                  <div className="upload-bar" role="progressbar" aria-valuenow={task.progress}>
                    <div className="upload-bar-fill" style={{ width: `${task.progress}%` }} />
                  </div>
                ) : null}
                {task.state === 'error' && task.error ? (
                  <p className="upload-task-error">{task.error}</p>
                ) : null}
              </div>
              <div className="upload-task-side">
                {task.state === 'uploading' ? (
                  <span className="upload-pct">{task.progress}%</span>
                ) : null}
                {task.state === 'done' ? <span className="upload-ok">Saved</span> : null}
                {task.state === 'error' ? (
                  <button type="button" className="upload-retry" onClick={() => retry(task)}>
                    Retry
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
