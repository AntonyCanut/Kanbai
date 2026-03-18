import { useRef, useEffect, useCallback, useState } from 'react'

interface NoteEditorProps {
  noteId: string | null
  initialContent: string
  onChange: (content: string) => void
  placeholder?: string
}

const MAX_IMAGE_DIMENSION = 1920
const MAX_IMAGE_BYTES = 4 * 1024 * 1024

function isPlainText(content: string): boolean {
  return !/<[a-z][\s\S]*>/i.test(content)
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>')
}

async function readAndResizeImage(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = () => {
      const dataUri = reader.result as string

      if (file.size <= MAX_IMAGE_BYTES) {
        resolve(dataUri)
        return
      }

      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let { width, height } = img

        if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
          const ratio = Math.min(MAX_IMAGE_DIMENSION / width, MAX_IMAGE_DIMENSION / height)
          width = Math.round(width * ratio)
          height = Math.round(height * ratio)
        }

        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          resolve(null)
          return
        }

        ctx.drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL('image/jpeg', 0.85))
      }
      img.onerror = () => resolve(null)
      img.src = dataUri
    }
    reader.onerror = () => resolve(null)
    reader.readAsDataURL(file)
  })
}

export function NoteEditor({ noteId, initialContent, onChange, placeholder }: NoteEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const lastNoteIdRef = useRef<string | null>(null)
  const [selectedImage, setSelectedImage] = useState<HTMLImageElement | null>(null)
  const [handlePositions, setHandlePositions] = useState<{
    top: number
    left: number
    width: number
    height: number
  } | null>(null)
  const resizeStateRef = useRef<{
    startX: number
    startY: number
    startWidth: number
    startHeight: number
    aspectRatio: number
    handle: string
  } | null>(null)

  // Set innerHTML only when note changes
  useEffect(() => {
    if (noteId !== lastNoteIdRef.current && editorRef.current) {
      lastNoteIdRef.current = noteId
      const displayContent = isPlainText(initialContent) ? escapeHtml(initialContent) : initialContent
      editorRef.current.innerHTML = displayContent || ''
      setSelectedImage(null)
      setHandlePositions(null)
    }
  }, [noteId, initialContent])

  const notifyChange = useCallback(() => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML)
    }
  }, [onChange])

  const insertImage = useCallback(
    async (file: File) => {
      if (!file.type.startsWith('image/')) return

      const dataUri = await readAndResizeImage(file)
      if (!dataUri || !editorRef.current) return

      const img = document.createElement('img')
      img.src = dataUri
      img.className = 'note-inline-image'
      img.style.maxWidth = '100%'
      img.setAttribute('draggable', 'true')

      const selection = window.getSelection()
      if (selection?.rangeCount && editorRef.current.contains(selection.anchorNode)) {
        const range = selection.getRangeAt(0)
        range.deleteContents()

        const br = document.createElement('br')
        range.insertNode(br)
        range.insertNode(img)
        range.setStartAfter(br)
        range.collapse(true)
        selection.removeAllRanges()
        selection.addRange(range)
      } else {
        editorRef.current.appendChild(document.createElement('br'))
        editorRef.current.appendChild(img)
      }

      notifyChange()
    },
    [notifyChange],
  )

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (items) {
        for (const item of Array.from(items)) {
          if (item.type.startsWith('image/')) {
            e.preventDefault()
            const file = item.getAsFile()
            if (file) insertImage(file)
            return
          }
        }
      }

      // Paste as plain text to strip formatting
      e.preventDefault()
      const text = e.clipboardData?.getData('text/plain') || ''
      document.execCommand('insertText', false, text)
    },
    [insertImage],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      const files = e.dataTransfer?.files
      if (files?.length) {
        for (const file of Array.from(files)) {
          if (file.type.startsWith('image/')) {
            e.preventDefault()
            e.stopPropagation()
            insertImage(file)
            return
          }
        }
      }
    },
    [insertImage],
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (e.dataTransfer?.types?.includes('Files')) {
      e.preventDefault()
    }
  }, [])

  const handleInput = useCallback(() => {
    notifyChange()
  }, [notifyChange])

  // Update resize handle positions
  const updateHandlePositions = useCallback((img: HTMLImageElement) => {
    if (!editorRef.current) return
    const editorRect = editorRef.current.getBoundingClientRect()
    const imgRect = img.getBoundingClientRect()
    setHandlePositions({
      top: imgRect.top - editorRect.top + editorRef.current.scrollTop,
      left: imgRect.left - editorRect.left + editorRef.current.scrollLeft,
      width: imgRect.width,
      height: imgRect.height,
    })
  }, [])

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'IMG' && target.classList.contains('note-inline-image')) {
        const img = target as HTMLImageElement
        setSelectedImage(img)
        updateHandlePositions(img)
        e.preventDefault()
      } else {
        setSelectedImage(null)
        setHandlePositions(null)
      }
    },
    [updateHandlePositions],
  )

  // Handle keyboard events on selected image
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!selectedImage) return

      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()
        selectedImage.remove()
        setSelectedImage(null)
        setHandlePositions(null)
        notifyChange()
      } else if (e.key === 'Escape') {
        setSelectedImage(null)
        setHandlePositions(null)
      }
    },
    [selectedImage, notifyChange],
  )

  // Resize logic
  const handleResizeStart = useCallback(
    (e: React.MouseEvent, handle: string) => {
      if (!selectedImage) return
      e.preventDefault()
      e.stopPropagation()

      const startWidth = selectedImage.offsetWidth
      const startHeight = selectedImage.offsetHeight

      resizeStateRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        startWidth,
        startHeight,
        aspectRatio: startWidth / startHeight,
        handle,
      }

      const handleMouseMove = (moveE: MouseEvent) => {
        const state = resizeStateRef.current
        if (!state || !selectedImage) return

        let dx = moveE.clientX - state.startX
        if (state.handle.includes('left')) dx = -dx

        const newWidth = Math.max(50, state.startWidth + dx)
        const newHeight = Math.round(newWidth / state.aspectRatio)

        selectedImage.style.width = `${newWidth}px`
        selectedImage.style.height = `${newHeight}px`

        updateHandlePositions(selectedImage)
      }

      const handleMouseUp = () => {
        resizeStateRef.current = null
        if (selectedImage) {
          updateHandlePositions(selectedImage)
        }
        notifyChange()
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }

      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    },
    [selectedImage, notifyChange, updateHandlePositions],
  )

  // Deselect on click outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (editorRef.current && !editorRef.current.contains(e.target as Node)) {
        setSelectedImage(null)
        setHandlePositions(null)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  // Update handle positions on scroll
  useEffect(() => {
    const editor = editorRef.current
    if (!editor || !selectedImage) return

    const handleScroll = () => updateHandlePositions(selectedImage)
    editor.addEventListener('scroll', handleScroll)
    return () => editor.removeEventListener('scroll', handleScroll)
  }, [selectedImage, updateHandlePositions])

  const resizeHandles = ['top-left', 'top-right', 'bottom-left', 'bottom-right']

  return (
    <div className="note-editor-wrapper">
      <div
        ref={editorRef}
        className="notes-editor-content"
        contentEditable
        onInput={handleInput}
        onPaste={handlePaste}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        data-placeholder={placeholder}
        suppressContentEditableWarning
      />
      {selectedImage && handlePositions && (
        <div
          className="note-image-resize-overlay"
          style={{
            top: handlePositions.top,
            left: handlePositions.left,
            width: handlePositions.width,
            height: handlePositions.height,
          }}
        >
          <div className="note-image-resize-border" />
          {resizeHandles.map((handle) => (
            <div
              key={handle}
              className={`note-image-resize-handle note-image-resize-handle--${handle}`}
              onMouseDown={(e) => handleResizeStart(e, handle)}
            />
          ))}
          <div className="note-image-resize-dimensions">
            {Math.round(handlePositions.width)} x {Math.round(handlePositions.height)}
          </div>
        </div>
      )}
    </div>
  )
}
