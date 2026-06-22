import type { LocaleMessageValue } from 'vue-i18n'

export default {
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
      },
      success: {
        title: 'Conexión exitosa',
        description: 'Se ha establecido conexión con el servidor: {name}',
      },
      error: {
        title: 'Error al conectar',
        description: 'No se ha podido establecer conexión con el servidor: {name}',
      }
    },
    delete: {
      loading: {
        title: 'Eliminando servidor',
        description: 'Se está eliminando el servidor: {name}',
      },
      success: {
        title: 'Servidor eliminado correctamente',
        description: 'Se ha eliminado el servidor: {name}',
      },
      error: {
        title: 'Error al eliminar el servidor',
        description: 'No se ha podido eliminar el servidor: {name}',
      }
    }
  }
} satisfies LocaleMessageValue