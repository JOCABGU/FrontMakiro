import type { ReactNode } from 'react'

interface ModalProps {
  open: boolean
  title: string
  children: ReactNode
  onClose: () => void
  actions?: ReactNode
  maxWidthClass?: string
  contentClassName?: string
}

const Modal = ({ open, title, children, onClose, actions, maxWidthClass, contentClassName }: ModalProps) => {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-sm">
      <div className={`bento-modal ${maxWidthClass ?? 'max-w-lg'} max-h-[92vh] overflow-y-auto`}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <button className="text-slate-400 transition hover:text-slate-700" onClick={onClose} type="button">
            x
          </button>
        </div>
        <div className={`mt-4 text-sm text-slate-600 ${contentClassName ?? ''}`}>{children}</div>
        {actions ? <div className="mt-6 flex justify-end gap-3">{actions}</div> : null}
      </div>
    </div>
  )
}

export default Modal
