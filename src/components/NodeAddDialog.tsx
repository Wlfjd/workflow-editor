import { useEffect, useId, useRef, useState } from 'react'
import { NODE_KIND_CONFIG } from '../constants'
import type { NodeKind } from '../types'

export interface NodeAddDraft {
  kind: NodeKind
  label: string
  description: string
}

interface NodeAddDialogProps {
  kind: NodeKind
  defaultLabel: string
  defaultDescription: string
  onConfirm: (draft: NodeAddDraft) => void
  onCancel: () => void
}

export function NodeAddDialog({
  kind,
  defaultLabel,
  defaultDescription,
  onConfirm,
  onCancel,
}: NodeAddDialogProps) {
  const titleId = useId()
  const labelRef = useRef<HTMLInputElement>(null)
  const [label, setLabel] = useState(defaultLabel)
  const [description, setDescription] = useState(defaultDescription)

  useEffect(() => {
    labelRef.current?.focus()
    labelRef.current?.select()
  }, [])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onCancel])

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    const trimmedLabel = label.trim()
    if (!trimmedLabel) return
    onConfirm({
      kind,
      label: trimmedLabel,
      description: description.trim() || defaultDescription,
    })
  }

  const config = NODE_KIND_CONFIG[kind]

  return (
    <div className="dialog-backdrop" onPointerDown={onCancel}>
      <div
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <h2 id={titleId} className="dialog-title">
          {config.title} 노드 추가
        </h2>
        <form className="dialog-form" onSubmit={handleSubmit}>
          <label className="dialog-field">
            <span>제목</span>
            <input
              ref={labelRef}
              type="text"
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              placeholder="노드 제목"
              maxLength={80}
            />
          </label>
          <label className="dialog-field">
            <span>설명</span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="노드 설명"
              rows={3}
              maxLength={200}
            />
          </label>
          <div className="dialog-actions">
            <button type="button" className="btn" onClick={onCancel}>
              취소
            </button>
            <button type="submit" className="btn btn-primary">
              추가
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
