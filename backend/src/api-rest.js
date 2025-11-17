const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();

// Lista de orígenes permitidos
const allowedOrigins = [
  'http://localhost:5000',
  'https://productividad-final-waeq.vercel.app', // Reemplaza con tu dominio de Vercel
  'file://',
  'null',
  'https://*.ngrok.io',
  'https://*.ngrok-free.app'
];

// Middleware para parsear JSON y CORS
// Configuración mejorada de CORS
app.use(cors({
  origin: function (origin, callback) {
    // Permitir requests sin origen (como mobile apps o curl)
    if (!origin) return callback(null, true);
  

  
  const isAllowed =
  allowedOrigins.includes(origin) ||
  (origin && origin.includes('ngrok') && allowedOrigins.some(o => o.includes('*')));
      if (isAllowed){
      return callback(null, true);
    } else {
      console.log('Origen bloqueado por CORS:', origin);
      return callback(new Error('Not allowed by CORS'), false);
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'ngrok-skip-browser-warning', 'Accept', 'Origin', 'X-Requested-With'],
  credentials: true,
}));

// Middleware para headers adicionales
//app.use((req, res, next) => {
  //const origin = req.headers.origin;
  
  // Verificar si el origen está en la lista permitida
  //if (allowedOrigins.some(allowedOrigin => 
      //origin === allowedOrigin || 
      //(allowedOrigin.includes('*') && origin && origin.includes('ngrok')))) {
    //res.header('Access-Control-Allow-Origin', origin);
  //}
  
  //res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  //res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, ngrok-skip-browser-warning, Accept, Origin, X-Requested-With');
  //res.header('Access-Control-Expose-Headers', 'Content-Type, Authorization');
  //res.header('Access-Control-Allow-Credentials', 'true');
  
  //if (req.method === 'OPTIONS') {
    //return res.status(200).end();
  //}
  
  //next();
//});

// Middleware para manejar preflight requests
//app.options('*', cors());

// Middleware para parsear JSON
app.use(express.json());

const port = process.env.PORT || 5000;



// Configuración de la base de datos (ajusta según tu entorno)
const pool = new Pool({
  host: process.env.DB_HOST || '192.188.57.61',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'sgr_std',
  user: process.env.DB_USER || 'sisapp',
  password: process.env.DB_PASSWORD || 'sis@pp2023'
});



// Middleware para parsear JSON
/////http://localhost:5000/estadisticas/usuarios?fecha_desde=2025-09-01&fecha_hasta=2025-09-01
/////////////////////////////////////////////
/////////////////////////////////////////////
// Endpoint: GET /estadisticas/usuarios?fecha_desde=YYYY-MM-DD&fecha_hasta=YYYY-MM-DD
/////////////////////////////////////////////
/////////////////////////////////////////////

app.get('/estadisticas/usuarios', async (req, res) => {
    //res.header('Access-Control-Allow-Origin', req.headers.origin);
  //res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  //res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, Origin, X-Requested-With');
  const { fecha_desde, fecha_hasta } = req.query;

  // Validar parámetros obligatorios
  if (!fecha_desde || !fecha_hasta) {
    return res.status(400).json({
      error: 'Parámetros "fecha_desde" y "fecha_hasta" son obligatorios (formato YYYY-MM-DD)'
    });
  }

  // Validar formato de fechas
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(fecha_desde) || !dateRegex.test(fecha_hasta)) {
    return res.status(400).json({
      error: 'Formato de fecha inválido. Usa YYYY-MM-DD'
    });
  }

  // Parsear fechas y ajustar fecha_hasta
  try {
    const fechaDesde = new Date(`${fecha_desde}T00:00:00-05:00`);
    let fechaHasta = new Date(`${fecha_hasta}T00:00:00-05:00`);
    fechaHasta.setDate(fechaHasta.getDate() + 1);

    if (isNaN(fechaDesde) || isNaN(fechaHasta)) {
      return res.status(400).json({
        error: 'Fechas inválidas. Usa YYYY-MM-DD'
      });
    }

    const query = `
      SELECT 
        UPPER(ro.nombre)::CHARACTER(100) AS rol_usuario_titulo, 
        COUNT(DISTINCT us.id)::NUMERIC AS usuarios, 
        COUNT(rl.id)::NUMERIC AS cantidad_tramites, 
        SUM(rl.peso_tramite)::NUMERIC AS peso_tramites, 
        ro.id AS rol_id, 
        ro.nombre AS rol_nombre
      FROM flow.regp_liquidacion rl
      LEFT JOIN app.acl_user us ON us.id = rl.inscriptor 
      LEFT JOIN conf.tar_usuario_tareas ut ON ut.usuario = us.id
      LEFT JOIN app.acl_rol ro ON ro.id = ut.rol
      WHERE rl.fecha_ingreso >= $1  AND rl.fecha_ingreso < $2 
      GROUP BY ro.nombre, ro.id 
      ORDER BY rol_usuario_titulo
    `;

    const client = await pool.connect();
    console.log('Conexión a DB establecida  para /estadisticas/usuarios');
    try {
      const result = await client.query(query, [fechaDesde, fechaHasta]);
      res.status(200).json({
        success: true,
        data: result.rows,
        total_registros: result.rowCount
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error en /estadisticas/usuarios:',error);
    res.status(500).json({
      error: `Error en la consulta: ${error.message}`,
      stack: error.stack
    });
  }
});


/////////////////////////////////////////////
////http://localhost:5000/estadisticas/detalle?fecha_desde=2025-09-01&fecha_hasta=2025-09-01&nombre=tramites_judiciales
/////////////////////////////////////////////
// Nuevo Endpoint: GET /estadisticas/detalle?fecha_desde=YYYY-MM-DD&fecha_hasta=YYYY-MM-DD&nombre_tipo=rol
/////////////////////////////////////////////
/////////////////////////////////////////////

app.get('/estadisticas/detalle', async (req, res) => {
  const { fecha_desde, fecha_hasta, nombre } = req.query;

  // Validar parámetros obligatorios
  if (!fecha_desde || !fecha_hasta || !nombre) {
    return res.status(400).json({
      error: 'Parámetros "fecha_desde", "fecha_hasta" y "nombre" son obligatorios (fecha: YYYY-MM-DD, nombre: texto)'
    });
  }

  // Validar formato de fechas
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(fecha_desde) || !dateRegex.test(fecha_hasta)) {
    return res.status(400).json({
      error: 'Formato de fecha inválido. Usa YYYY-MM-DD'
    });
  }

  // Parsear fechas y ajustar fecha_hasta
  try {
    const fechaDesde = new Date(`${fecha_desde}T00:00:00-05:00`);
    let fechaHasta = new Date(`${fecha_hasta}T00:00:00-05:00`);
    fechaHasta.setDate(fechaHasta.getDate() + 1);

    if (isNaN(fechaDesde) || isNaN(fechaHasta)) {
      return res.status(400).json({
        error: 'Fechas inválidas. Usa YYYY-MM-DD'
      });
    }

    // Consulta SQL (adaptada del documento Estadistica-Detalle de usuarios.txt)
    const query = `
      WITH regp_liq_det AS (
        WITH npasos AS (
          WITH n_tareas AS (    
            SELECT proc_inst_id_ AS id_proceso, 
                   COUNT(*) AS npasos, 
                   MAX(id_) AS idd 
            FROM act_hi_taskinst aht 
            GROUP BY proc_inst_id_
          )
          SELECT a.id_proceso, 
                 a.npasos, 
                 b.name_ AS ultima_accion, 
                b.start_time_  AS fecha_proceso
          FROM n_tareas a
          LEFT JOIN act_hi_taskinst b ON a.idd = b.id_
        )
        SELECT liquidacion, 
               ht.fecha_ingreso  AS fecha_ingreso, 
               ht.fecha_entrega  AS fecha_entrega, 
               ht.num_tramite, 
               COUNT(*) AS ntramites,
                ahp.end_time_  AS end_time_,
               EXTRACT(EPOCH FROM (ahp.end_time_ - np.fecha_proceso)) / 60 AS duracion_min,
               SUM(CASE 
                  WHEN EXTRACT(EPOCH FROM (((ht.fecha_entrega::DATE)::TIMESTAMP  + INTERVAL '16 hours') - np.fecha_proceso)) < 0 
                   THEN 1 
                   ELSE 0 
                 END) AS fuera_cal
        FROM flow.regp_liquidacion_detalles rld
        LEFT JOIN flow.regp_liquidacion liq ON rld.liquidacion = liq.id 
        LEFT JOIN flow.historico_tramites ht ON ht.id = liq.tramite
        LEFT JOIN act_hi_procinst ahp ON ht.id_proceso = ahp.id_
        LEFT JOIN npasos np ON ahp.id_ = np.id_proceso
        WHERE liq.fecha_ingreso >= $1  AND liq.fecha_ingreso < $2 
        GROUP BY liquidacion, ht.fecha_ingreso, ht.fecha_entrega, ht.num_tramite, ahp.end_time_, np.fecha_proceso
      )
        SELECT 
        (COALESCE(ce.apellidos, '') || ' ' || COALESCE(ce.nombres, ''))::CHARACTER(250) AS nombre_usuario, 
        COUNT(DISTINCT (rl.fecha_ingreso::DATE))::NUMERIC AS dias_lab, 
        COUNT(DISTINCT rl.id) AS ntram, 
        SUM(rld.ntramites) AS tramites, 
        SUM(rl.peso_tramite) AS peso,
        SUM(CASE WHEN end_time_ IS NULL THEN 1 ELSE 0 END)::NUMERIC AS no_terminado,
        999.99 AS eficiencia,
        SUM(fuera_cal)::NUMERIC AS fuera,
        999.99 AS eficacia,
        us.usuario 
      FROM regp_liq_det rld
      LEFT JOIN flow.regp_liquidacion rl ON rld.liquidacion = rl.id 
      LEFT JOIN app.acl_user us ON us.id = rl.inscriptor 
      LEFT JOIN conf.tar_usuario_tareas ut ON ut.usuario = us.id
      LEFT JOIN app.acl_rol ro ON ro.id = ut.rol
      LEFT JOIN app.cat_ente ce ON us.ente = ce.id
      WHERE rl.fecha_ingreso >= $1  AND rl.fecha_ingreso < $2  AND ro.nombre = $3
      GROUP BY (COALESCE(ce.apellidos, '') || ' ' || COALESCE(ce.nombres, '')), us.usuario, ro.nombre 
      ORDER BY nombre_usuario
    `;

    const client = await pool.connect();
    console.log('Conexión a DB establecida para /estadisticas/detalle');
    try {
      const result = await client.query(query, [fechaDesde, fechaHasta, nombre]);
      
      // Calcular eficiencia y eficacia
      const processedRows = result.rows.map(row => {
        const tramites = parseFloat(row.tramites) || 0;
        const no_terminado = parseFloat(row.no_terminado) || 0;
        const fuera = parseFloat(row.fuera) || 0;

        const eficiencia = tramites > 0 ? ((tramites - no_terminado) / tramites * 100).toFixed(2) : 0;
        const eficacia = tramites > 0 && (tramites - no_terminado) > 0 
          ? (((tramites - no_terminado) - fuera) / (tramites - no_terminado) * 100).toFixed(2) 
          : 0;

        return {
          ...row,
          eficiencia,
          eficacia
        };
      });

      res.status(200).json({
        success: true,
        data: processedRows,
        total_registros: result.rowCount
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error en /estadisticas/detalle:', error);
    res.status(500).json({
      error: `Error en la consulta: ${error.message}`,
      stack: error.stack
    });
  }
});



/////////////////////////////////////////////
///http://localhost:5000/estadisticas/detalle_usuario?fecha_desde=2025-09-01&fecha_hasta=2025-09-01&nombre=tramites_judiciales&usuario=mgarcia
/////////////////////////////////////////////
// Nuevo Endpoint: GET /estadisticas/detalle_usuario?fecha_desde=YYYY-MM-DD&fecha_hasta=YYYY-MM-DD&usuario=username
/////////////////////////////////////////////
/////////////////////////////////////////////

app.get('/estadisticas/detalle_usuario', async (req, res) => {
    const { fecha_desde, fecha_hasta, nombre, usuario } = req.query;
  
    // Validar parámetros obligatorios
    if (!fecha_desde || !fecha_hasta || !nombre  || !usuario) {
      return res.status(400).json({
        error: 'Parámetros "fecha_desde", "fecha_hasta" , "nombre" y "usuario" son obligatorios (fecha: YYYY-MM-DD,  usuario y nombre: texto)'
      });
    }
  
    // Validar formato de fechas
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(fecha_desde) || !dateRegex.test(fecha_hasta)) {
      return res.status(400).json({
        error: 'Formato de fecha inválido. Usa YYYY-MM-DD'
      });
    }
  
    // Parsear fechas y ajustar fecha_hasta
    try {
      const fechaDesde = new Date(`${fecha_desde}T00:00:00-05:00`);
      let fechaHasta = new Date(`${fecha_hasta}T00:00:00-05:00`);
      fechaHasta.setDate(fechaHasta.getDate() + 1);
  
      if (isNaN(fechaDesde) || isNaN(fechaHasta)) {
        return res.status(400).json({
          error: 'Fechas inválidas. Usa YYYY-MM-DD'
        });
      }
  
 

      // Consulta SQL adaptada para detalles por trámite de un usuario específico
      const query = `
 with npasos as (
	with n_tareas as (		
		select proc_inst_id_ as id_proceso, count(*) as npasos, max(id_) as idd 
		from act_hi_taskinst aht 
		group by proc_inst_id_
	)
	select a.id_proceso, a.npasos, b.name_ as ultima_accion, b.start_time_  AS fecha_proceso
	from n_tareas a
	left join act_hi_taskinst b on a.idd = b.id_
)
select ht.num_tramite, 
       ac.nombre::character(100) as contrato, 
       (coalesce(en.apellidos ||' '||COALESCE(en.nombres,''),en.razon_social))::character(100) as nombre,
       ht.fecha_ingreso  AS fecha_ingreso, 
       np.fecha_proceso as fecha_proceso,
        ahp.end_time_  AS fecha_fin, 
       liq.peso_tramite, 
       np.ultima_accion::character(100), 
       0 + 0 as cambio_cer,
       np.npasos,
       ht.fecha_entrega AS fecha_entrega,
       EXTRACT(epoch from (((ht.fecha_entrega::date)::timestamp without time zone + '16 hours') - np.fecha_proceso )) as tiempo_atraso
from flow.regp_liquidacion_detalles rld
left join app.reg_acto ac on ac.id = rld.acto
left join flow.regp_liquidacion liq on rld.liquidacion = liq.id 
left join flow.historico_tramites ht on ht.id = liq.tramite
left join act_hi_procinst ahp on ht.id_proceso = ahp.id_
left join app.acl_user us on us.id = liq.inscriptor 
left join conf.tar_usuario_tareas ut on ut.usuario = us.id
left join app.acl_rol ro on ro.id = ut.rol	
left join app.cat_ente en on en.id = liq.beneficiario
left join npasos np on ahp.id_ = np.id_proceso
where liq.fecha_ingreso >= $1
  and liq.fecha_ingreso < $2
  and ro.nombre = $3
  and us.usuario = $4
`; 
const client = await pool.connect();
console.log('Conexión a DB establecida para /estadisticas/detalle_usuario'); 
try {
   const result = await client.query(query, [fechaDesde, fechaHasta, nombre, usuario]);
    // Calcular eficiencia y eficacia
const processedRows = result.rows.map(row => {
  const tramites = parseFloat(row.tramites) || 0;
  const no_terminado = parseFloat(row.no_terminado) || 0;
  const fuera = parseFloat(row.fuera) || 0;
  
  const eficiencia = tramites > 0 ? ((tramites - no_terminado) / tramites * 100).toFixed(2) : 0;
  const eficacia = tramites > 0 && (tramites - no_terminado) > 0
   ? (((tramites - no_terminado) - fuera) / (tramites - no_terminado) * 100).toFixed(2)
    : 0;

  return {
     ...row,
      eficiencia,
       eficacia
      };
     });
  res.status(200).json({
     success: true,
      data: processedRows,
       total_registros: result.rowCount
       });
       } finally {
         client.release();
         }
        } catch (error) {
           console.error('Error en /estadisticas/detalle_usuario:', error);
            res.status(500).json({
               error: `Error en la consulta: ${error.message}`,
                stack: error.stack 
              });
             }
             });


/////////////////////////////////////////////
/////////////////////////////////////////////
// Nuevo Endpoint: GET /estadisticas/detalle_tramite?num_tramite=XXXX
/////////////////////////////////////////////
///http://localhost:5000/estadisticas/detalle_tramite?num_tramite=757264
/////////////////////////////////////////////
app.get('/estadisticas/detalle_tramite', async (req, res) => {
  const { num_tramite } = req.query;

  // Validar parámetro obligatorio
  if (!num_tramite) {
    return res.status(400).json({
      error: 'Parámetro "num_tramite" es obligatorio'
    });
  }

  // Validar formato del número de trámite (solo números)
  const numTramiteRegex = /^\d+$/;
  if (!numTramiteRegex.test(num_tramite)) {
    return res.status(400).json({
      error: 'El parámetro "num_tramite" debe ser un número válido'
    });
  }

  try {
    const client = await pool.connect();
    console.log('Conexión a DB establecida para /estadisticas/detalle_tramite');

    try {
      // Primera consulta: Eventos
      const eventosQuery = `
        SELECT 
          aht.end_time_  AS fecha_fin,  
          aht.name_::CHARACTER(250) AS proceso, 
          aht.assignee_::CHARACTER(250) AS usuario
        FROM flow.regp_liquidacion_detalles rld
        LEFT JOIN flow.regp_liquidacion liq ON rld.liquidacion = liq.id 
        LEFT JOIN flow.historico_tramites ht ON ht.id = liq.tramite
        LEFT JOIN act_hi_procinst ahp ON ht.id_proceso = ahp.id_
        LEFT JOIN act_hi_taskinst aht ON ahp.id_ = aht.proc_inst_id_  
        WHERE liq.num_tramite_rp = $1
        ORDER BY aht.end_time_ DESC
      `;

      // Segunda consulta: Cambios
      const cambiosQuery = `
        SELECT 
          rb.fecha_hora  AS fecha_hora, 
          rb.actividad::CHARACTER(250) AS actividad, 
          au.usuario
        FROM flow.historico_tramites ht
        LEFT JOIN flow.regp_tareas_tramite rtt ON rtt.tramite = ht.id
        LEFT JOIN app.reg_movimiento rm ON rm.num_tramite = rtt.id
        JOIN bitacora.reg_bitacora rb ON rb.id_movimiento = rm.id
        LEFT JOIN app.acl_user au ON au.id = rb.id_usuario 
        WHERE ht.num_tramite = $1
        UNION 
        SELECT 
          a.fecha_hora, 
          a.actividad::CHARACTER(250) AS actividad, 
          au.usuario
        FROM app.reg_certificado rc 
        JOIN bitacora.reg_bitacora a ON a.id_certificado = rc.id
        LEFT JOIN app.acl_user au ON au.id = a.id_usuario 
        WHERE rc.num_tramite = $1
      `;

      // Ejecutar ambas consultas
      const eventosResult = await client.query(eventosQuery, [num_tramite]);
      const cambiosResult = await client.query(cambiosQuery, [num_tramite]);

      res.status(200).json({
        success: true,
        data: {
          eventos: eventosResult.rows,
          cambios: cambiosResult.rows
        },
        total_eventos: eventosResult.rowCount,
        total_cambios: cambiosResult.rowCount
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error en /estadisticas/detalle_tramite:', error);
    res.status(500).json({
      error: `Error en la consulta: ${error.message}`,
      stack: error.stack
    });
  }
});


// Endpoint raíz
app.get('/', (req, res) => {
  res.json({
    mensaje: 'API de Estadísticas de Usuarios - CORS Configurado',
    endpoints: {
      usuarios: '/estadisticas/usuarios?fecha_desde=YYYY-MM-DD&fecha_hasta=YYYY-MM-DD',
      detalle: '/estadisticas/detalle?fecha_desde=YYYY-MM-DD&fecha_hasta=YYYY-MM-DD&nombre=rol',
      detalle_usuario: '/estadisticas/detalle_usuario?fecha_desde=YYYY-MM-DD&fecha_hasta=YYYY-MM-DD&nombre=rol&usuario=username',
      detalle_tramite: '/estadisticas/detalle_tramite?num_tramite=XXXX'
    }
  });
});

// Iniciar servidor
app.listen(port, () => {
  console.log(`Servidor corriendo en http://192.188.2.240:${port}`);
  console.log(`✅ CORS configurado para todos los dominios`);
});