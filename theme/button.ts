export default {
  compoundVariants: [
    {
      color: 'primary',
      variant: 'solid',
      class: `bg-linear-to-br from-primary to-secondary 
        hover:from-primary/75 hover:to-secondary/75 
        active:from-primary/75 active:to-secondary/75 
        disabled:from-primary disabled:to-secondary
      `
    }, {
      color: 'primary',
      variant: 'outline',
      class: `
        bg-linear-to-br
        hover:from-primary/10 hover:to-secondary/10 
        active:from-primary/10 active:to-secondary/10 
      `
    }

  ]
}
