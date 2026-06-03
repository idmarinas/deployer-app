import { LocaleMessageValue } from 'vue-i18n'

export default <LocaleMessageValue>{
  title: 'Servidores',
  table: {
    columns: {
      name: 'Nombre',
      ip: 'IP',
      port: 'Puerto',
      auth_type: 'Tipo de autenticación',
      enabled: 'Habilitado',
      created_at: 'Creación',
    },
    dropdown: {
      test_connection: 'Probar conexión',
    },
    empty: {
      title: 'No se han encontrado servidores',
      description: 'Parece que no has añadido ningún servidor. Crea uno para empezar.',
    }
  },
  toast: {
    test_connection: {
      loading: {
        title: 'Probando conexión',
        description: 'Se está comprobando que se puede conectar al servidor: {name}',
        icon: 'i-tabler-plug',
      },
      success: {
        title: 'Conexión exitosa',
        description: 'Se ha establecido conexión con el servidor: {name}',
        icon: 'i-tabler-check',
      },
      error: {
        title: 'Error al conectar',
        description: 'No se ha podido establecer conexión con el servidor: {name}',
        icon: 'i-tabler-x',
      }
    },
    delete: {
      loading: {
        title: 'Eliminando servidor',
        description: 'Se está eliminando el servidor: {name}',
        icon: 'i-tabler-trash',
      },
      success: {
        title: 'Servidor eliminado correctamente',
        description: 'Se ha eliminado el servidor: {name}',
        icon: 'i-tabler-check',
      },
      error: {
        title: 'Error al eliminar el servidor',
        description: 'No se ha podido eliminar el servidor: {name}',
        icon: 'i-tabler-x',
      }
    }
  }
}