// const fastify = require('fastify')()


// fastify.register(require('@fastify/postgres'), {
//   connectionString:  process.env.POSTGRES_CONNECTION
// })


/*
BigInt.prototype['toJSON'] = function () {
    return parseInt(this.toString());
};*/


const sql_EC = (params, query) => {

  return  `
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


const sql_EJB = (params, query) => {
  return  `
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

      ${params.personalid ? ` AND  fd.jefe_brigada_id = ${params.personalid}` : ''}
      ${params.fechaasignacion ? ` AND  fd.fecha_asignacion = '${params.fechaasignacion}'` : ''}
      -- Optional Filter
  )
  SELECT ST_AsMVT(mvtgeom.*, 'public.ficha_lote', 4096, 'geom' , 'id') AS mvt from mvtgeom;
  `
}

const sql_CCE = (params, query) => {
  return  `
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

      --${params.personalid ? ` AND  fd.jefe_brigada_id = ${params.personalid}` : ''}
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
  module.exports =  function(fastify, opts, next) {
    fastify.route({
      method: 'GET',
      url: '/mvt/lotesasignados/:table/:z/:x/:y/:personalid/:fechaasignacion',
      schema: schema,
      handler:   function(request, reply) {

        //fastify.pg.connect(onConnect)
          fastify.pg.query(`select pc.abreviatura
             from personal_personal pp  inner join personal_personalacceso pa on pp.id = pa.personal_id 
              inner join personal_cargo pc on pa.cargo_id = pc.id  	
               where pp.id=$1 	 
             `,[request.params.personalid],function onResult(err,result){
              
              console.log(result.rows[0].abreviatura);
              const cargo =result.rows[0].abreviatura

              if (cargo=='EC'){
                fastify.pg.query(sql_EC(request.params, request.query),function onResult1(err1,result1){
                  //console.log(result1.rows[0].mvt);

                  const mvt = result1.rows[0].mvt

                  if (mvt.length === 0) {
                    reply.code(204).send()
                  }
                  reply.header('Content-Type', 'application/x-protobuf').send(mvt)
                })
              }

              if (cargo=='EJB'){
                fastify.pg.query(sql_EJB(request.params, request.query),function onResult1(err1,result1){
                  //console.log(result1.rows[0].mvt);

                  const mvt = result1.rows[0].mvt

                  if (mvt.length === 0) {
                    reply.code(204).send()
                  }
                  reply.header('Content-Type', 'application/x-protobuf').send(mvt)
                })
              }

              if (cargo=='CCE'){
                fastify.pg.query(sql_CCE(request.params, request.query),function onResult1(err1,result1){
                  //console.log(result1.rows[0].mvt);

                  const mvt = result1.rows[0].mvt

                  if (mvt.length === 0) {
                    reply.code(204).send()
                  }
                  reply.header('Content-Type', 'application/x-protobuf').send(mvt)
                })
              }


             })


        //----------------------------

        // const client = await fastify.pg.connect()

        
        //   const resultado = await client.query(`
        //   select pc.abreviatura

        //   from personal_personal pp  inner join personal_personalacceso pa on pp.id = pa.personal_id 
        //     inner join personal_cargo pc on pa.cargo_id = pc.id  	
    
        //     where pp.id=$1 	 
          
        //   `,[req.params.personalid],)

          
        //   // client.release();


        //   const resultado2 = await client.query(`
        //   select pc.abreviatura

        //   from personal_personal pp  inner join personal_personalacceso pa on pp.id = pa.personal_id 
        //     inner join personal_cargo pc on pa.cargo_id = pc.id  	
    
        //     where pp.id=$1 	 
          
        //   `,[req.params.personalid],)

        //   //client.release();

        //   console.log(resultado.rows);


        //   const cargo = await resultado.rows[0].abreviatura;
        //   console.log(cargo);

        //   if (cargo=='EC'){

        //     console.log('=>'+cargo);

        //     await client.query(sql_EC(req.params, req.query), async function onResult(
        //       err,
        //       result
        //     ) {
        //       client.release()
        //       if (err) {
        //         res.send(err)
        //       } else {
        //         const mvt = await result.rows[0].mvt
        //         if (mvt.length === 0) {
        //           res.code(204).send()
        //         }
        //         res.header('Content-Type', 'application/x-protobuf').send(mvt)
        //       }
        //     })
            
        //   }
          
          
          // res.send({
          //   abreviatura: resultado.rows[0].abreviatura,
          //   abreviatura2: resultado2.rows[0].abreviatura,
            
          // })

      }
    })

    
    next()
  }
  
  module.exports.autoPrefix = '/v1'
  
