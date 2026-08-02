type PageHeaderProps = {
  title: string
  description: string
}

export function PageHeader({ title, description }: PageHeaderProps) {
  return (
    <header className="mb-8 space-y-1.5">
      <h1 className="font-heading text-2xl tracking-tight text-foreground md:text-[1.75rem]">
        {title}
      </h1>
      <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
    </header>
  )
}
