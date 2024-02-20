// route query
const sql = (params, query) => {

  console.log(`
  
  SELECT json_build_object( 
    'xmin',st_xmin(ST_Extent(ST_Transform(${query.geom_column}, ${query.srid}))),
    'ymin',st_ymin(ST_Extent(ST_Transform(${query.geom_column}, ${query.srid}))),
    'xmax',st_xmax(ST_Extent(ST_Transform(${query.geom_column}, ${query.srid}))),
    'ymax',st_ymax(ST_Extent(ST_Transform(${query.geom_column}, ${query.srid}))),
    'bbox',ST_Extent(ST_Transform(${query.geom_column}, ${query.srid}))
    ) as bbox_lote
    
  
    FROM
      
      public.ficha_lote 
  
        WHERE id=${params.loteid}
  
  
  `);



  return `
  SELECT json_build_object( 
    'xmin',st_xmin(ST_Extent(ST_Transform(${query.geom_column}, ${query.srid}))),
    'ymin',st_ymin(ST_Extent(ST_Transform(${query.geom_column}, ${query.srid}))),
    'xmax',st_xmax(ST_Extent(ST_Transform(${query.geom_column}, ${query.srid}))),
    'ymax',st_ymax(ST_Extent(ST_Transform(${query.geom_column}, ${query.srid}))),
    'bbox',ST_Extent(ST_Transform(${query.geom_column}, ${query.srid}))
    ) AS bbox_lote
    
  
    FROM
      
      public.ficha_lote 
  
        WHERE id=${params.loteid}
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
    loteid: {
      type: 'string',
      description: 'Lote ID.'
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
    url: '/bbox/fichalote/:table/:loteid',
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

