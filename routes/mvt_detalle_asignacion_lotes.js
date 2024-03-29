// route query
const sql = (params, query) => {

    console.log(
        `
        WITH mvtgeom as (
            SELECT
              ST_AsMVTGeom (
                ST_Transform(fl.geom, 3857),
                ST_TileEnvelope(${params.z}, ${params.x}, ${params.y})
              ) as geom 
	      , fl.lote
	      , fl.codigo
              , fd.personal_id
              , fd.estado_asignacion
	      , fd.asignacion_id
	      , fd.lote_id
              , fd.id
              , fd.id
    
            FROM
              public.ficha_lote fl inner join public.ficha_detalleasignacion fd
              on fl.id = fd.lote_id,
              (SELECT ST_SRID(geom) AS srid FROM public.ficha_lote WHERE geom IS NOT NULL LIMIT 1) a
            WHERE
              ST_Intersects(
                geom,
                ST_Transform(
                  ST_TileEnvelope(${params.z}, ${params.x}, ${params.y}),
                  srid
                )
              )
    
              ${params.personalid ? ` AND  fd.personal_id = ${params.personalid}` : ''}
	      ${params.fechaasignacion ? ` AND  fd.fecha_asignacion = '${params.fechaasignacion}'` : ''}
    
              -- Optional Filter
    
          )
          SELECT ST_AsMVT(mvtgeom.*, 'public.ficha_lote', 4096, 'geom' , 'id') AS mvt from mvtgeom;

        
        `
      );


    return `
    WITH mvtgeom as (
        SELECT
          ST_AsMVTGeom (
            ST_Transform(fl.geom, 3857),
            ST_TileEnvelope(${params.z}, ${params.x}, ${params.y})
          ) as geom 
	  , fl.lote
	  , fl.codigo
          , fd.personal_id
          , fd.estado_asignacion
	  , fd.asignacion_id
	  , fd.lote_id
          , fd.id
          , fd.id

        FROM
          public.ficha_lote fl inner join public.ficha_detalleasignacion fd
          on fl.id = fd.lote_id,
          (SELECT ST_SRID(geom) AS srid FROM public.ficha_lote WHERE geom IS NOT NULL LIMIT 1) a
        WHERE
          ST_Intersects(
            geom,
            ST_Transform(
              ST_TileEnvelope(${params.z}, ${params.x}, ${params.y}),
              srid
            )
          )

          ${params.personalid ? ` AND  fd.personal_id = ${params.personalid}` : ''}
	  ${params.fechaasignacion ? ` AND  fd.fecha_asignacion = '${params.fechaasignacion}'` : ''}
          

          -- Optional Filter

      )
      SELECT ST_AsMVT(mvtgeom.*, 'public.ficha_lote', 4096, 'geom' , 'id') AS mvt from mvtgeom;
    `
    
  }

  // route schema
  const schema = {
    description:
      'Return table as Mapbox Vector Tile (MVT). The layer name returned is the name of the table.',
    tags: ['feature'],
    summary: 'return MVT',
    params: {
      table: {
        type: 'string',
        description: 'The name of the table or view.'
      },
      z: {
        type: 'integer',
        description: 'Z value of ZXY tile.'
      },
      x: {
        type: 'integer',
        description: 'X value of ZXY tile.'
      },
      y: {
        type: 'integer',
        description: 'Y value of ZXY tile.'
      },
      personalid: {
        type: 'integer',
        description: 'ID del Personal.'
      },
      fechaasignacion: {
        type: 'string',
        description: 'Fecha de Asignacion de Lotes.'
      },    
    },
    querystring: {
      geom_column: {
        type: 'string',
        description: 'Optional geometry column of the table. The default is geom.',
        default: 'geom'
      },
      columns: {
        type: 'string',
        description:
          'Optional columns to return with MVT. The default is no columns.'
      },
      id_column: {
        type: 'string',
        description:
          'Optional id column name to be used with Mapbox GL Feature State. This column must be an integer a string cast as an integer.'
      },
      filter: {
        type: 'string',
        description: 'Optional filter parameters for a SQL WHERE statement.'
      }
    }
  }
  
  // create route
  module.exports = function(fastify, opts, next) {
    fastify.route({
      method: 'GET',
      url: '/mvt/asigna/:table/:z/:x/:y/:personalid/:fechaasignacion',
      schema: schema,
      handler: function(request, reply) {
        fastify.pg.connect(onConnect)
  
        function onConnect(err, client, release) {
          if (err) {
            request.log.error(err)
            return reply.code(500).send({ error: "Database connection error." })
          }
  
          client.query(sql(request.params, request.query), function onResult(
            err,
            result
          ) {
            release()
            if (err) {
              reply.send(err)
            } else {
              const mvt = result.rows[0].mvt
              if (mvt.length === 0) {
                reply.code(204).send()
              }
              reply.header('Content-Type', 'application/x-protobuf').send(mvt)
            }
          })
        }
      }
    })

    
    next()
  }
  
  module.exports.autoPrefix = '/apicolector'
  
