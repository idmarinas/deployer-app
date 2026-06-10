import { LocaleMessageValue } from 'vue-i18n'

export default <LocaleMessageValue>{
  title: "Claves de acceso",
  table: {
    columns: {
      name: 'Nombre',
      type: 'Tipo',
      fingerprint: 'Huella digital',
    },
    empty: {
      title: "No se han encontrado claves de acceso",
      description: "Parece que no has añadido ninguna clave de acceso. Crea una para empezar."
    }
  },
  toast: {
    delete: {
      loading: {
        title: 'Eliminando clave de acceso...',
        description: 'Eliminando clave de acceso {name}...'
      },
      success: {
        title: 'Clave de acceso eliminada',
        description: 'Clave de acceso {name} eliminada correctamente'
      },
      error: {
        title: 'Error al eliminar clave de acceso',
        description: 'Error al eliminar clave de acceso {name}'
      }
    }
  }
}