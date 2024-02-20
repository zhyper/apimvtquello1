// route query
const sql = (params, query) => {
  let bounds = query.bounds ? query.bounds.split(',').map(Number) : null;

  console.log( `
  

  SELECT distinct
  jsonb_build_object(
    'type',       'Feature',
    'geometry',   ST_AsGeoJSON(geom, 9)::jsonb,
    'properties', to_jsonb( subq.* ) - 'geom'
  ) AS geojson

FROM (
  SELECT distinct
    ST_Transform(fl.geom, 4326) as geom,
    fl.lote,fl.bbox,cm.codigo 

    --${query.columns ? `, fd.${query.columns}` : ''}
    --${ query.id_column ? `, fd.${query.id_column}` : '' }


  FROM
    public.ficha_lote fl inner join public.ficha_detalleasignacion fd
          on fl.id=fd.lote_id INNER JOIN public.configuracion_manzana cm ON fl.manzana_id=cm.id,

    (SELECT ST_SRID(geom) AS srid FROM public.ficha_lote WHERE geom IS NOT NULL LIMIT 1) a

        where fd.personal_id=${params.personalid} and fd.fecha_asignacion='${params.fechaasignacion}'
	ORDER by cm.id, fl.lote

) as subq



`);

  return `

  SELECT 
  jsonb_build_object(
    'type',       'Feature',
    'geometry',   ST_AsGeoJSON(geom, 9)::jsonb,
    'properties', to_jsonb( subq.* ) - 'geom'
  ) AS geojson

FROM (
  SELECT distinct
    ST_Transform(fl.geom, 4326) as geom,
    fl.lote,fl.bbox,cm.codigo AS cod_manzana,fd.fecha_asignacion,cm.nombre

    --${query.columns ? `, fd.${query.columns}` : ''}
    --${ query.id_column ? `, fd.${query.id_column}` : '' }


  FROM
    public.ficha_lote fl inner join public.ficha_detalleasignacion fd
          on fl.id=fd.lote_id INNER JOIN public.configuracion_manzana cm ON fl.manzana_id=cm.id,

    (SELECT ST_SRID(geom) AS srid FROM public.ficha_lote WHERE geom IS NOT NULL LIMIT 1) a

        where fd.personal_id=${params.personalid} and fd.fecha_asignacion='${params.fechaasignacion}'
	ORDER BY cod_manzana, fl.lote	

) as subq
ORDER by cod_manzana,lote


  `
}

// route schema
const schema = {
  description: 'Return table as GeoJSON.',
  tags: ['feature'],
  summary: 'return GeoJSON',
  params: {
    table: {
      type: 'string',
      description: 'The name of the table or view.'
    },
    personalid: {
      type: 'string',
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
      description: 'The geometry column of the table.',
      default: 'geom'
    },
    columns: {
      type: 'string',
      description: 'Columns to return as GeoJSON properites. The default is no columns. <br/><em>Note: the geometry column should not be listed here, and columns must be explicitly named.</em>'
    },
    id_column: {
      type: 'string',
      description:
        'Optional id column name to be used with Mapbox GL Feature State. This column must be an integer a string cast as an integer.'
    },
    filter: {
      type: 'string',
      description: 'Optional filter parameters for a SQL WHERE statement.'
    },
    bounds: {
      type: 'string',
      pattern: '^-?[0-9]{0,20}.?[0-9]{1,20}?(,-?[0-9]{0,20}.?[0-9]{1,20}?){2,3}$',
      description: 'Optionally limit output to features that intersect bounding box. Can be expressed as a bounding box (sw.lng, sw.lat, ne.lng, ne.lat) or a Z/X/Y tile (0,0,0).'
    },
    precision: {
      type: 'integer',
      description: 'The maximum number of decimal places to return. Default is 9.',
      default: 9
    }
  }
}

// create route
module.exports = function (fastify, opts, next) {
  fastify.route({
    method: 'GET',
    url: '/geojson/asignacion/:table/:personalid/:fechaasignacion',
    schema: schema,
    handler: function (request, reply) {
      fastify.pg.connect(onConnect)

      function onConnect(err, client, release) {
        if (err) {
          request.log.error(err)
          return reply.code(500).send({ error: "Database connection error." })
        }

        client.query(
          sql(request.params, request.query),
          function onResult(err, result) {
            release()
            if (err) {
              reply.send(err)
            } else {
                if (result.rows.length === 0) {
                reply.code(204).send()
              } else {
                const json = {
                  type: 'FeatureCollection',
                  features: result.rows.map((el) => el.geojson)
                }
                reply.send(json)
              }
            }
          }
        )
      }
    }
  })
  next()
}

module.exports.autoPrefix = '/v1'

