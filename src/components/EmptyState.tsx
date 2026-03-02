interface Props {
  message?: string
  icon?: string
}

export default function EmptyState({ message = 'Заявок нет', icon = '📭' }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-white/40">
      <span className="text-4xl mb-3">{icon}</span>
      <span className="text-sm">{message}</span>
    </div>
  )
}
