// route query
const sql = (params, query) => {

  console.log(`
  
 SELECT
        --ST_AsGeoJSON(ST_Extent(ST_Transform(${query.geom_column}, ${query.srid}))) as bbox
        json_build_object(
                'xmin',st_xmin(ST_Extent(ST_Transform(${query.geom_column}, ${query.srid}))),
                'ymin',st_ymin(ST_Extent(ST_Transform(${query.geom_column}, ${query.srid}))),
                'xmax',st_xmax(ST_Extent(ST_Transform(${query.geom_column}, ${query.srid}))),
                'ymax',st_ymax(ST_Extent(ST_Transform(${query.geom_column}, ${query.srid}))),
                'bbox',ST_Extent(ST_Transform(${query.geom_column}, ${query.srid})),
                'xmin_19',st_xmin(ST_Extent(ST_Transform(geom, 32719))),
                'ymin_19',st_ymin(ST_Extent(ST_Transform(geom, 32719))),
                'xmax_19',st_xmax(ST_Extent(ST_Transform(geom, 32719))),
                'ymax_19',st_ymax(ST_Extent(ST_Transform(geom, 32719))),
                'bbox_19',ST_Extent(ST_Transform(geom, 32719))
        ) AS bbox_lotes_asignados


  FROM

    public.ficha_lote fl inner join public.ficha_detalleasignacion fd
          on fl.id = fd.lote_id

  -- Optional where filter


    WHERE fd.personal_id=${params.personalid} AND fd.fecha_asignacion='${params.fechaasignacion}'

  
  
  `);



  return `

 SELECT
  	--ST_AsGeoJSON(ST_Extent(ST_Transform(${query.geom_column}, ${query.srid}))) as bbox
	json_build_object(
      		'xmin',st_xmin(ST_Extent(ST_Transform(${query.geom_column}, ${query.srid}))),
      		'ymin',st_ymin(ST_Extent(ST_Transform(${query.geom_column}, ${query.srid}))),
	        'xmax',st_xmax(ST_Extent(ST_Transform(${query.geom_column}, ${query.srid}))),
	        'ymax',st_ymax(ST_Extent(ST_Transform(${query.geom_column}, ${query.srid}))),
      		'bbox',ST_Extent(ST_Transform(${query.geom_column}, ${query.srid})),
		'xmin_19',st_xmin(ST_Extent(ST_Transform(geom, 32719))),
      		'ymin_19',st_ymin(ST_Extent(ST_Transform(geom, 32719))),
	        'xmax_19',st_xmax(ST_Extent(ST_Transform(geom, 32719))),
      		'ymax_19',st_ymax(ST_Extent(ST_Transform(geom, 32719))),
      		'bbox_19',ST_Extent(ST_Transform(geom, 32719))
	) AS bbox_lotes_asignados


  FROM
    
    public.ficha_lote fl inner join public.ficha_detalleasignacion fd
          on fl.id = fd.lote_id

  -- Optional where filter
  

    WHERE fd.personal_id=${params.personalid} AND fd.fecha_asignacion='${params.fechaasignacion}'
  `
}

// route schema
const schema = {
  description: 'Gets the bounding box of a feature(s).',
  tags: ['api'],
  summary: 'minimum bounding rectangle',
  params: {
    table: {
      type: 'string',
      description: 'The name of the table or view to query.'
    },
    personalid: {
      type: 'string',
      description: 'Personal ID.'
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
    srid: {
      type: 'integer',
      description: 'The SRID for the returned centroid. The default is <em>4326</em> WGS84 Lat/Lng.',
      default: 4326
    },
    filter: {
      type: 'string',
      description: 'Optional filter parameters for a SQL WHERE statement.'
    }
  }
}

// create route
module.exports = function (fastify, opts, next) {
  fastify.route({
    method: 'GET',
    url: '/bbox/asignacion/:table/:personalid/:fechaasignacion',
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
            reply.send(err || result.rows)
          }
        )
      }
    }
  })
  next()
}

module.exports.autoPrefix = '/v1'

