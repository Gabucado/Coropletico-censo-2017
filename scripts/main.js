// Author: Gabucado
const map_width =  600;
const map_height = 600;
const map_visualizer = {
  width:  map_width,
  height: map_height,
  margin: {
    left:   10,
    right:  10,
    top:    10,
    bottom: 30,
    zoom: {
      scale:      [1, 30],
      translate:  [[0, 0], [map_width, map_height]]
    }
  }
};

const graph_width = map_width;
const graph_height = Math.floor(map_height/4);
const graph_visualizer = {
  width: graph_width,
  height: graph_height,
  margin: {
    left:   70,
    right:  70,
    top:    10,
    bottom: 10,
    zoom: {
      scale:      [1, 15],
      translate:  [[0, 0], [map_width, map_height]]
    }
  }
};

const pie_colors = {
  males: "#308eab", females: "#ab3030"
}

const bar_colors = {
  left: "#E9F060", right: "#5253A3"
}

const color_map_scale = (attribute_map) => {
  const data_array = Object.values(data_base),
        maximum = d3.max(data_array, (d) => d.data.demography[attribute_map]),
        minimum = d3.min(data_array, (d) => d.data.demography[attribute_map]);
  const color_scale = d3
    .scaleSequential()
    .interpolator(d3.interpolateLab("#4a4a4a", "#5CCAEB"))
    .domain([minimum, maximum])
  return color_scale
} 

const comunas_geoJSON = "data\\comunas.geojson",
      comunas_data = "data\\censo.csv";

// como hacer un bocadito: https://chartio.com/resources/tutorials/how-to-show-data-on-mouseover-in-d3js/#creating-a-tooltip-using-the-title-tag
const tooltip = d3.select("body")
  .append("div")
  .attr("id", "tooltip")
  .attr("class", "tooltip-class")
  .text("placeholder")

function reset_zoom () {
  const tag = "#g-map";
  d3.select(tag)
    .transition().duration(750)
      .call(zoom_map.transform, d3.zoomIdentity.scale(1).translate(0, 0))
      .attr("transform", d3.zoomIdentity)
  d3.select("#svg-map")
    .transition().duration(750)
      .call(zoom_map.transform, d3.zoomIdentity.scale(1).translate(0, 0))
};

function zoom_in_button () {
  const tag = "#g-map";
  d3.select(tag).transition().call(zoom_map.scaleBy, 2)
  d3.select("#svg-map")
    .transition().duration(750)
      .call(zoom_map.scaleBy, 2)
};

function zoom_out_button () {
  const tag = "#g-map";
  d3.select(tag).transition().call(zoom_map.scaleBy, 0.5)
  d3.select("#svg-map")
    .transition().duration(750)
      .call(zoom_map.scaleBy, 0.5)
}


function create_map_buttons() {
  const buttons = ["Reset", "Zoom_in", "Zoom_out"], 
        button_selection = d3.select("#map")
          .append("div")
          .attr("class", "flex-map-section"),
        funcs = {
          Reset: reset_zoom, 
          Zoom_in: zoom_in_button, 
          Zoom_out: zoom_out_button}
  button_selection.selectAll("button")
    .data(buttons)
    .join("button")
      .attr("name", (d) => d)
      .attr("type", "button")
      .attr("class", "button")
      .text((d)=> d.replace("_", " "))
      .on("click", (d, i) => funcs[i]())
};

//          d3-zoom class' notes 
const zoom_handler = (tag) => {
  if (tag == "svg-map") {
    return zoom_handler_map
  }
};

function zoom_handler_map(event) {
  const transformation = event.transform,
        tag = "#g-map"
  
  d3.select(tag)
    .transition()
      .duration(50)
      .attr("transform", transformation)
};

// source:  https://observablehq.com/@d3/programmatic-zoom?collection=@d3/d3-zoom
//          d3-zoom class' notes 
function set_zoom(tag, dimensions) {
  const tag_arg = tag.replace("#", ""),
        func = zoom_handler(tag_arg);
  zoom_map = d3.zoom()
    .extent(
      [
        [0, 0],
        [dimensions.width, dimensions.height]
      ]
    )
    .scaleExtent(dimensions.margin.zoom.scale)
    .translateExtent(dimensions.margin.zoom.translate)
    .on("zoom", func)
    
    // d3.select(tag.replace('svg-', ""))
    d3.select(tag)
      .call(zoom_map)
}

function create_svg(tag, dimensions) {
  const svg_handler = d3.select(tag)
    .append("svg")
      .attr("width", dimensions.width)
      .attr("id", `svg-${tag.replace("#", "")}`)
      .attr("class", "flex-map-section")
      .attr("height", dimensions.height)
      .append("g")
        .attr("id", `g-${tag.replace("#", "")}`);
  return svg_handler;
};

function load_data_json(path, func, args) {
  d3.json(path)
    .then((data) => func(data, args))
    .catch((error) => console.log(error));
};

function data_map_setter(data, packet) {
  // Code from prof.'s lectures
  const svg = packet[0];
  const dimensions = packet[1];
  const attribute = packet[2];
  const custom_projection = d3
    .geoMercator()
      .fitSize(
        [
          dimensions.width - dimensions.margin.left - dimensions.margin.right,
          dimensions.height - dimensions.margin.top - dimensions.margin.bottom
        ], data);

  const geoPaths = d3.geoPath()
    .projection(custom_projection);


  svg
    .selectAll("path")
    .data(data.features, (d) => d.id)
    .join("path")
      .attr("d", geoPaths)
      .attr('id', (d) => d.properties.id)
      .attr("class", "map-district")
      .style("fill", (d) => map_colormap(data_base[d.properties.id].data.demography[attribute]))
      .on("mouseover", (_, data) => {
        d3.select("#tooltip")
            .html(tooltip_filler(data, "map"))
            .style("visibility", "visible");
        })
      .on("mousemove", (event, _) => {
        d3.select("#tooltip")
          .style("top", (event.pageY-20)+"px")
          .style("left",(event.pageX+20)+"px")
        })
      .on("mouseout", () => {
        d3.select("#tooltip")
            .style("visibility", "hidden");
        })
      .on("click", (event, data) => {
        update_graphs(event, data)
      })
    
}; 

function update_graphs(event, data) {
  console.log("update to", event, data);
  const commune_target = data.id;
  // male-female-chart
  
  const attrs_pie = attribute_pie[1],
        subattr_pie = attribute_pie[0];

  const data_pie = [
    {categoria: attrs_pie[0], value: data_base[commune_target].data[subattr_pie][attrs_pie[0]]},
    {categoria: attrs_pie[1], value: data_base[commune_target].data[subattr_pie][attrs_pie[1]]}
  ];

  let svg = d3.select("#male-female-chart").selectAll("path")
  const arcs = d3
          .arc()
          .innerRadius((map_visualizer.width/2) - 60 - 10)
          .outerRadius((map_visualizer.width/2) - 40 - 10)
          .cornerRadius(1),
        pie = d3
          .pie()
          .value((d) => d.value)
          .sort(null)
          .startAngle(Math.PI)
          .endAngle(Math.PI * 2);
        arc_data = pie(data_pie);
  console.log(arc_data)
  
  svg
    .data(arc_data)
    .transition().duration(250)
      .attr("d", (d) => arcs(d))
      
  // male-female-chart-regional
  svg = d3.select("#male-female-chart-regional").selectAll("path")

  const sector_id = data_base[commune_target].ids.region_id;
  const region_array = [];
  const national_array = [];

  for(const zone_id in data_base) {
    if (data_base[zone_id].ids.region_id === sector_id) {
      region_array.push(zone_id);
    }
    national_array.push(zone_id);
  }
  const attrs_reg_0 = d3.sum(region_array, (d) => data_base[d].data[subattr_pie][attrs_pie[0]]);
  const attrs_reg_1 = d3.sum(region_array, (d) => data_base[d].data[subattr_pie][attrs_pie[1]]);
  const data_pie_regional = [
    {categoria: attrs_pie[0], value: attrs_reg_0},
    {categoria: attrs_pie[1], value: attrs_reg_1}
  ];
  const regional_arc_data = pie(data_pie_regional),
        regional_arcs = d3
          .arc()
          .innerRadius((map_visualizer.width/2)-40 - 5)
          .outerRadius((map_visualizer.width/2)-20 - 5)
          .cornerRadius(1)
  
  svg
    .data(regional_arc_data)
    .transition().duration(250)
      .attr("d", (d) => regional_arcs(d))

  // Tablas
  
  const region_name = data_base[commune_target].ids.region[0] + data_base[commune_target].ids.region.slice(1).toLowerCase()
  const province_name = data_base[commune_target].ids.province[0] + data_base[commune_target].ids.province.slice(1).toLowerCase()
  const commune_name = data_base[commune_target].ids.commune[0] + data_base[commune_target].ids.commune.slice(1).toLowerCase()

  const html_0 = `<pre><center><text_graph_title>Dependencia</text_graph_title><br><bajada_graph>${region_name}, ${province_name}, ${commune_name}</bajada_graph></center></pre>`
  d3.select("#graph_0").select(".graph_title")
    .html(html_0)
  
  const html_1 = `<pre><center><text_graph_title>Naturaleza habitacional</text_graph_title><br><bajada_graph>${region_name}, ${province_name}, ${commune_name}</bajada_graph></center></pre>`
  d3.select("#graph_1").select(".graph_title")
    .html(html_1)

  const subattr_gph0 = attribute_top_[0],
        attrs_gph0 = attribute_top_[1];

  const lenght_bar_0 = graph_visualizer.width - (graph_visualizer.margin.left),
      height_bar_0 = graph_visualizer.height - (graph_visualizer.margin.top + graph_visualizer.margin.bottom);

  const data_graph_0 = [];
  // Nacional
  const national_data_graph0 = [0, 0, 0];
  national_array.forEach(id => {
    for(let i = 0; i < attrs_gph0.length; i++){
      national_data_graph0[i] += data_base[id].data[subattr_gph0][attrs_gph0[i]]
    };
  });
  // Regional
  const regional_data_graph0 = [0, 0, 0];
  region_array.forEach(id => {
    for(let i = 0; i < attrs_gph0.length; i++){
      regional_data_graph0[i] += data_base[id].data[subattr_gph0][attrs_gph0[i]]
    }
  });
  // Comunal
  const communal_data_graph0 = [0, 0, 0];
  for(let i = 0; i < attrs_gph0.length; i++){
    communal_data_graph0[i] += data_base[sector_id].data[subattr_gph0][attrs_gph0[i]]
  }

  const data_set_graph0 = [],
    titles_stack_0 = ['Nacional', 'Regional', 'Comunal'],
    keys_graph0 = {
      dep_ju: "Juvenil",
      dep_ve: "Vejez"
  }; // Hardcodeado ;w;

  [
    national_data_graph0,
    regional_data_graph0, 
    communal_data_graph0
  ].forEach((value, index) => {
    let instance_graph0 = {};
    Object.keys(keys_graph0).forEach((va, in_) => {
      instance_graph0[keys_graph0[va]] = value[in_+1]/value[0]
    });
    instance_graph0["title"] = titles_stack_0[index]
    data_set_graph0.push(instance_graph0)
  })
  const stacker_graph0 = d3
    .stack()
    .keys(Object.values(keys_graph0));

  const series_graph0 = stacker_graph0(data_set_graph0);

  const scaleX_graph0 = d3
    .scaleLinear()
    .domain([0, 1])
    .range([lenght_bar_0, graph_visualizer.margin.left]);

  const scaleY = d3
    .scaleBand()
    .domain(d3.range(data_set_graph0.length))
    .range([graph_visualizer.margin.top, height_bar_0])
    .padding(0.3);

  console.log(series_graph0)
  const svg_1 = d3
    .select("#g-graph0")
      .selectAll("g")
      .data(series_graph0)
        .selectAll("rect")
        .data((d) => d)
          .transition().duration(250)
          .attr("x", (d, i) => scaleX_graph0(d[1]))
          .attr("y", (d, i) => scaleY(i))
          .attr("height", scaleY.bandwidth())
          .attr("width", (d, i) => scaleX_graph0(d[0]) - scaleX_graph0(d[1]))
  
  const subattr_gph1 = attribute_bottom_[0],
        attrs_gph1 = attribute_bottom_[1];

  const lenght_bar_1 = graph_visualizer.width - (graph_visualizer.margin.left),
        height_bar_1 = graph_visualizer.height - (graph_visualizer.margin.top + graph_visualizer.margin.bottom);

  // Nacional
  const national_data_graph1 = [0, 0, 0];
  national_array.forEach(id => {
    for(let i = 0; i < attrs_gph1.length; i++){
      national_data_graph1[i] += data_base[id].data[subattr_gph1][attrs_gph1[i]]
    };
  });
  // Regional
  const regional_data_graph1 = [0, 0, 0];
  region_array.forEach(id => {
    for(let i = 0; i < attrs_gph1.length; i++){
      regional_data_graph1[i] += data_base[id].data[subattr_gph1][attrs_gph1[i]]
  }});
  // Comunal
  const communal_data_graph1 = [0, 0, 0];
  for(let i = 0; i < attrs_gph1.length; i++){
    communal_data_graph1[i] += data_base[sector_id].data[subattr_gph1][attrs_gph1[i]]
  }

  const data_set_graph1 = [],
        titles_stack_1 = ['Nacional', 'Regional', 'Comunal'],
        keys_graph1 = {
          colective: "Colectivo",
          particular: "Particular"
  }; // Hardcodeado ;w;
  
  [
    national_data_graph1,
    regional_data_graph1, 
    communal_data_graph1
  ].forEach((value, index) => {
    let instance_graph1 = {};
    Object.keys(keys_graph1).forEach((va, in_) => {
      instance_graph1[keys_graph1[va]] = value[in_+1]/value[0]
    })
    instance_graph1["title"] = titles_stack_1[index]
    data_set_graph1.push(instance_graph1)
  })

  const stacker_graph1 = d3
    .stack()
    .keys(Object.values(keys_graph1));
  
  const series_graph1 = stacker_graph1(data_set_graph1);
  
  const scaleX_graph1 = d3
    .scaleLinear()
    .domain([0, 1])
    .range([lenght_bar_1, graph_visualizer.margin.left]);

  const scaleY1 = d3
    .scaleBand()
    .domain(d3.range(data_set_graph1.length))
    .range([graph_visualizer.margin.top, height_bar_1])
    .padding(0.3);

  const svg_2 = d3
  .select("#g-graph1")
    .selectAll("g")
    .data(series_graph1)
      .selectAll("rect")
      .data((d) => d)
        .transition().duration(250)
        .attr("x", (d, i) => scaleX_graph1(d[1]))
        .attr("y", (d, i) => scaleY1(i))
        .attr("height", scaleY.bandwidth())
        .attr("width", (d, i) => scaleX_graph1(d[0]) - scaleX_graph0(d[1]))

}

function tooltip_filler(data, type) {
  if(type === "map") {
    const id = data.id.toString();
    const html = "<pre><toolt_head>region, province<br></toolt_head><toolt_title>name</toolt_title><br><toolt_data>Densidad:&#09 density <sup>Personas</sup>&frasl;<sub>kM<sup>2</sup></sub><br>Poblacion:&#09 pop<br>Viviendas:&#09 housing</toolt_data></pre>"
      .replace("region", data_base[id].ids.region[0] + data_base[id].ids.region.slice(1).toLowerCase())
      .replace("province", data_base[id].ids.province[0] + data_base[id].ids.province.slice(1).toLowerCase())
      .replace("name", data.properties.comuna)
      .replace("pop", data_base[id].data.demography.total)
      .replace("housing" , data_base[id].data.housing.total)
      .replace("density", data_base[id].data.demography.density)
    return html;
  } else {
    if (type==="pie_male/female_comunal") {
      const category = data.data.categoria,
            value = data.value;
      let genre = "";
      if (category === "females"){
        genre = "Femenina";
      } else {
        genre = "Masculina";
      };
      const html = `<pre><toolt_head>Poblacion comunal por genero</toolt_head><br><toolt_title>${genre}:&#09 ${value}</tootl_title></pre>`;
      return html;

    } else {
      if (type==="pie_male/female_regional") {
        const category = data.data.categoria,
              value = data.value;
        let genre = "";
        if (category === "females"){
          genre = "Femenina";
        } else {
          genre = "Masculina";
        };
        const html = `<pre><toolt_head>Poblacion regional por genero</toolt_head><br><toolt_title>${genre}:&#09 ${value}</tootl_title></pre>`;
        return html;
      } else {
        if (type==="pie_male/female_national"){
          const category = data.data.categoria,
          value = data.value;
          let genre = "";
          if (category === "females"){
            genre = "Femenina";
          } else {
            genre = "Masculina";
          };
          const html = `<pre><toolt_head>Poblacion nacional por genero</toolt_head><br><toolt_title>${genre}:&#09 ${value}</tootl_title></pre>`;
          return html;
        } else {
          if (type === "line_chart_0") {
            const cls_list = data[0].originalTarget.classList,
                  valuable_data = data[1].data
                  magnitude = cls_list[1],
                  group = cls_list[0];
            // console.log(data[1]);
            const magnitude_name = valuable_data.title.toLowerCase();
            let group_name = "";
            if (group === "stack-bar-0"){
              group_name = "Juvenil";
            } else {
              group_name = "Vejez";
            }
            const html = `<pre><toolt_head>Depenencia a nivel ${magnitude_name}</toolt_head><br><toolt_title>${group_name} es de ${(valuable_data[group_name]*100).toFixed(2)}%</toolt_title></pre>`
            return html
          } else {
            if (type === "line_chart_1") {
              const cls_list = data[0].originalTarget.classList,
                  valuable_data = data[1].data
                  magnitude = cls_list[1],
                  group = cls_list[0];
              const magnitude_name = valuable_data.title.toLowerCase();
              let group_name = "";
              if (group === "stack-bar-1"){
                group_name = "Particular";
              } else {
                group_name = "Colectivo";
              }
              const html = `<pre><toolt_head>Naturaleza de vivienda a nivel ${magnitude_name}</toolt_head><br><toolt_title>${group_name} es de ${(valuable_data[group_name]*100).toFixed(2)}%</toolt_title></pre>`
              return html
            }
          }
        }
      }
    }
  }
};

function instance_map(path_geoJson, dimensions, attribute_map) {
  const map_svg = create_svg("#map", dimensions);
  // Create map
  load_data_json(path_geoJson, data_map_setter, [map_svg, dimensions, attribute_map]);
  // Set Zoom
  set_zoom("#svg-map", dimensions);
};

function parser_csv(data) {
  // ID,REGION,PROVINCIA,COMUNA,NOM_REGION,NOM_PROVIN,NOM_COMUNA,
  // TOTAL_VIVI,PARTICULAR,COLECTIVAS,TOTAL_PERS,HOMBRES,MUJERES,DENSIDAD,INDICE_MAS,INDICE_DEP,IND_DEP_JU,IND_DEP_VE
  return {
    ids: {
      id:           data.ID, 
      region_id:    data.REGION, 
      province_id:  data.PROVINCIA, 
      commune_id:   data.COMUNA,
      region:       data.NOM_REGION, 
      province:     data.NOM_PROVIN, 
      commune:      data.NOM_COMUNA
    },
    data: {
      housing: {
        total:      parseInt(data.TOTAL_VIVI),
        particular: parseInt(data.PARTICULAR),
        colective:  parseInt(data.COLECTIVAS)
      },
      demography: {
        total:      parseInt(data.TOTAL_PERS),
        males:      parseInt(data.HOMBRES),
        females:    parseInt(data.MUJERES),
        density:    parseFloat(data.DENSIDAD),
        malfem:     parseFloat(data.INDICE_MAS),
        depend:    parseFloat(data.INDICE_DEP),
        dep_ju:     parseFloat(data.IND_DEP_JU),
        dep_ve:     parseFloat(data.IND_DEP_VE)
      }
    }
  }
};

function load_data_csv(path, parser, func, args) {
  d3.csv(path, parser)
    .then((data) => func(data, args))
    .catch((error) => console.log(error));
};

function instance_graphs(attribute_pie_, attributes_top, attributes_bottom, graph_size) {
  // Pie chart, se espera que contraste dos datos
  const subattr_pie = attribute_pie_[0],
        attrs_pie = attribute_pie_[1];

  const region = 100;

  const data_pie = [
    {categoria: attrs_pie[0], value: data_base[region].data[subattr_pie][attrs_pie[0]]},
    {categoria: attrs_pie[1], value: data_base[region].data[subattr_pie][attrs_pie[1]]}
  ];

  const svg = d3
        .select("#svg-map")
          .append("g")
          .attr("id", "male-female-chart")
          .attr("transform", "translate(" + map_visualizer.width/2 + ", " + map_visualizer.height/2 + ")"),
        arcs = d3
          .arc()
          .innerRadius((map_visualizer.width/2)-60 - 10)
          .outerRadius((map_visualizer.width/2)-40 - 10)
          .cornerRadius(1),
        pie = d3
          .pie()
          .value((d) => d.value)
          .sort(null)
          .startAngle(Math.PI)
          .endAngle(Math.PI * 2);

  const arc_data = pie(data_pie)

  svg
    .selectAll('path')
    .data(arc_data, (d)=> d.categoria)
    .enter()
    .append("path")
      .attr("class", "arc")
    .on("mouseover", (_, data) => {
      d3.select("#tooltip")
          .html(tooltip_filler(data, "pie_male/female_comunal"))
          .style("visibility", "visible");
      })
    .on("mousemove", (event, _) => {
      d3.select("#tooltip")
        .style("top", (event.pageY-20)+"px")
        .style("left",(event.pageX+20)+"px")
      })
    .on("mouseout", () => {
      d3.select("#tooltip")
          .style("visibility", "hidden");
      })
      .transition().duration(1000)
      .attr("d", (d) => arcs(d))
      .attr("fill", (d) => pie_colors[d.data.categoria])

  const sector_id = data_base[region].ids.region_id;
  const region_array = [];
  const national_array = [];

  for(const zone_id in data_base) {
    if (data_base[zone_id].ids.region_id === sector_id) {
      region_array.push(zone_id);
    }
    national_array.push(zone_id);
  }
  const attrs_reg_0 = d3.sum(region_array, (d) => data_base[d].data[subattr_pie][attrs_pie[0]]);
  const attrs_reg_1 = d3.sum(region_array, (d) => data_base[d].data[subattr_pie][attrs_pie[1]]);
  const attrs_nat_0 = d3.sum(national_array, (d)=> data_base[d].data[subattr_pie][attrs_pie[0]]);
  const attrs_nat_1 = d3.sum(national_array, (d)=> data_base[d].data[subattr_pie][attrs_pie[1]]);
  const data_pie_regional = [
    {categoria: attrs_pie[0], value: attrs_reg_0},
    {categoria: attrs_pie[1], value: attrs_reg_1}
  ];
  const data_pie_national = [
    {categoria: attrs_pie[0], value: attrs_nat_0},
    {categoria: attrs_pie[1], value: attrs_nat_1}
  ];
  const regional_arc_data = pie(data_pie_regional)
  const national_arc_data = pie(data_pie_national)
  
  const regional_pie_svg = d3
    .select("#svg-map")
      .append("g")
      .attr("id", "male-female-chart-regional")
      .attr("transform", "translate(" + map_visualizer.width/2 + ", " + map_visualizer.height/2 + ")"),
    regional_arcs = d3
      .arc()
      .innerRadius((map_visualizer.width/2) - 40 - 5)
      .outerRadius((map_visualizer.width/2) - 20 - 5)
      .cornerRadius(1)

  regional_pie_svg
    .selectAll('path')
    .data(regional_arc_data, (d)=> d.categoria)
    .enter()
    .append("path")
      .attr("class", "arc")
    .on("mouseover", (_, data) => {
      d3.select("#tooltip")
          .html(tooltip_filler(data, "pie_male/female_regional"))
          .style("visibility", "visible");
      })
    .on("mousemove", (event, _) => {
      d3.select("#tooltip")
        .style("top", (event.pageY-20)+"px")
        .style("left",(event.pageX+20)+"px")
      })
    .on("mouseout", () => {
      d3.select("#tooltip")
          .style("visibility", "hidden");
      })
      .transition().duration(1000)
      .attr("d", (d) => regional_arcs(d))
      .attr("fill", (d) => pie_colors[d.data.categoria])

  const national_pie_svg = d3
    .select("#svg-map")
      .append("g")
      .attr("id", "male-female-chart-regional")
      .attr("transform", "translate(" + map_visualizer.width/2 + ", " + map_visualizer.height/2 + ")"),
    national_arcs = d3
      .arc()
      .innerRadius((map_visualizer.width/2) - 20)
      .outerRadius((map_visualizer.width/2))
      .cornerRadius(1);

  national_pie_svg
    .selectAll('path')
    .data(national_arc_data, (d)=> d.categoria)
    .enter()
    .append("path")
      .attr("class", "arc")
    .on("mouseover", (_, data) => {
      d3.select("#tooltip")
          .html(tooltip_filler(data, "pie_male/female_national"))
          .style("visibility", "visible");
      })
    .on("mousemove", (event, _) => {
      d3.select("#tooltip")
        .style("top", (event.pageY-20)+"px")
        .style("left",(event.pageX+20)+"px")
      })
    .on("mouseout", () => {
      d3.select("#tooltip")
          .style("visibility", "hidden");
      })
      .transition().duration(1000)
      .attr("d", (d) => national_arcs(d))
      .attr("fill", (d) => pie_colors[d.data.categoria])

  // text data// Idea desechada
  // title_svg = d3.select("#svg-map")
  //   .append("g")
  //     .attr("transform", `translate(${map_visualizer.width/3}, ${map_visualizer.height/2})`)
  //     .append("text")
  //       .text(() => title_setter(region))
  
  // other charts 
  // chart 0 // Agregado comunal
  const region_name = data_base[region].ids.region[0] + data_base[region].ids.region.slice(1).toLowerCase()
  const province_name = data_base[region].ids.province[0] + data_base[region].ids.province.slice(1).toLowerCase()
  const commune_name = data_base[region].ids.commune[0] + data_base[region].ids.commune.slice(1).toLowerCase()
  const html_0 = `<pre><center><text_graph_title>Dependencia</text_graph_title><br><bajada_graph>${region_name}, ${province_name}, ${commune_name}</bajada_graph></center></pre>`

  d3.select("#graph_0")
    .append("div")
    .attr("class", "graph_title")
    .html(html_0)

  const svg_0 = d3
    .select("#graph_0")
    .attr("class", "graph")
      .append("svg")
        .attr("height", graph_size.height)
        .attr("width", graph_size.width)
        .attr("id", "svg-graph0")
        .append("g")
          .attr("id", "g-graph0")

    const subattr_gph0 = attributes_top[0],
          attrs_gph0 = attributes_top[1];
  
    const lenght_bar_0 = graph_size.width - (graph_size.margin.left),
          height_bar_0 = graph_size.height - (graph_size.margin.top + graph_size.margin.bottom);
    
    const data_graph_0 = [];
    // Nacional
    const national_data_graph0 = [0, 0, 0];
    national_array.forEach(id => {
      for(let i = 0; i < attrs_gph0.length; i++){
        national_data_graph0[i] += data_base[id].data[subattr_gph0][attrs_gph0[i]]
      };
    });
    // Regional
    const regional_data_graph0 = [0, 0, 0];
    region_array.forEach(id => {
      for(let i = 0; i < attrs_gph0.length; i++){
        regional_data_graph0[i] += data_base[id].data[subattr_gph0][attrs_gph0[i]]
    }});
    // Comunal
    const communal_data_graph0 = [0, 0, 0];
    for(let i = 0; i < attrs_gph0.length; i++){
      communal_data_graph0[i] += data_base[sector_id].data[subattr_gph0][attrs_gph0[i]]
    }
  
    const data_set_graph0 = [],
          titles_stack_0 = ['Nacional', 'Regional', 'Comunal'],
          keys_graph0 = {
            dep_ju: "Juvenil",
            dep_ve: "Vejez"
    }; // Hardcodeado ;w;
  
    [
      national_data_graph0,
      regional_data_graph0, 
      communal_data_graph0
    ].forEach((value, index) => {
      let instance_graph0 = {};
      Object.keys(keys_graph0).forEach((va, in_) => {
        instance_graph0[keys_graph0[va]] = value[in_+1]/value[0]
      })
      instance_graph0["title"] = titles_stack_0[index]
      data_set_graph0.push(instance_graph0)
    })
    const stacker_graph0 = d3
      .stack()
      .keys(Object.values(keys_graph0));
  
    const series_graph0 = stacker_graph0(data_set_graph0);
  
    const scale_color_graph0 = d3
      .scaleOrdinal()
      .domain(Object.values(keys_graph0))
      .range([bar_colors.left, bar_colors.right])
  
    const scaleX_graph0 = d3
      .scaleLinear()
      .domain([0, 1])
      .range([lenght_bar_0, graph_size.margin.left]);
  
    const scaleY = d3
      .scaleBand()
      .domain(d3.range(data_set_graph0.length))
      .range([graph_size.margin.top, height_bar_0])
      .padding(0.3);

    let owo = 0;
    let uwu = 0;
    // svg_0.append("g").attr('id', "g-text")
    svg_0
      .selectAll("g")
      .data(series_graph0)
      .enter()
        .append("g")
        .attr("fill", (d) => scale_color_graph0(d.key))
        .selectAll("rect")
        .data((d) => d)
        .enter()
          .append("rect")
          .attr("x", (d, i) => scaleX_graph0(d[1]))
          .attr("y", (d, i) => scaleY(i))
          .attr("height", scaleY.bandwidth())
          .attr("width", (d, i) => scaleX_graph0(d[0]) - scaleX_graph0(d[1]))
          .attr("class", (d, i) => {if(owo === 3){uwu++; owo=0};owo++;return "stack-bar-" + uwu + " zone-" + owo})
          .on("mouseover", (event, data) => {
            d3.select("#tooltip")
                .html(tooltip_filler([event, data], "line_chart_0"))
                .style("visibility", "visible");
            })
          .on("mousemove", (event, _) => {
            d3.select("#tooltip")
              .style("top", (event.pageY-20)+"px")
              .style("left",(event.pageX+20)+"px")
            })
          .on("mouseout", () => {
            d3.select("#tooltip")
                .style("visibility", "hidden");
            })


  // chart 1 // Segundo atributo

  const html_1 = `<pre><center><text_graph_title>Naturaleza habitacional</text_graph_title><br><bajada_graph>${region_name}, ${province_name}, ${commune_name}</bajada_graph></center></pre>`

  d3.select("#graph_1")
    .append("div")
    .attr("class", "graph_title")
    .html(html_1)

  const svg_1 = d3
    .select("#graph_1")
    .attr("class", "graph")
      .append("svg")
        .attr("height", graph_size.height)
        .attr("width", graph_size.width)
        .attr("id", "svg-graph1")
        .append("g")
          .attr("id", "g-graph1")
  
    const subattr_gph1 = attributes_bottom[0],
          attrs_gph1 = attributes_bottom[1];
  
    const lenght_bar_1 = graph_size.width - (graph_size.margin.left),
          height_bar_1 = graph_size.height - (graph_size.margin.top + graph_size.margin.bottom);
  
    // Nacional
    const national_data_graph1 = [0, 0, 0];
    national_array.forEach(id => {
      for(let i = 0; i < attrs_gph1.length; i++){
        national_data_graph1[i] += data_base[id].data[subattr_gph1][attrs_gph1[i]]
      };
    });
    // Regional
    const regional_data_graph1 = [0, 0, 0];
    region_array.forEach(id => {
      for(let i = 0; i < attrs_gph1.length; i++){
        regional_data_graph1[i] += data_base[id].data[subattr_gph1][attrs_gph1[i]]
    }});
    // Comunal
    const communal_data_graph1 = [0, 0, 0];
    for(let i = 0; i < attrs_gph1.length; i++){
      communal_data_graph1[i] += data_base[sector_id].data[subattr_gph1][attrs_gph1[i]]
    }
  
    const data_set_graph1 = [],
          titles_stack_1 = ['Nacional', 'Regional', 'Comunal'],
          keys_graph1 = {
            colective: "Colectivo",
            particular: "Particular"
    }; // Hardcodeado ;w;
    
    [
      national_data_graph1,
      regional_data_graph1, 
      communal_data_graph1
    ].forEach((value, index) => {
      let instance_graph1 = {};
      Object.keys(keys_graph1).forEach((va, in_) => {
        instance_graph1[keys_graph1[va]] = value[in_+1]/value[0]
      })
      instance_graph1["title"] = titles_stack_1[index]
      data_set_graph1.push(instance_graph1)
    })
  
    const stacker_graph1 = d3
      .stack()
      .keys(Object.values(keys_graph1));
  
    const series_graph1 = stacker_graph1(data_set_graph1);
  
    const scale_color_graph1 = d3
      .scaleOrdinal()
      .domain(Object.values(keys_graph1))
      .range([bar_colors.left, bar_colors.right])
  
    const scaleX_graph1 = d3
      .scaleLinear()
      .domain([0, 1])
      .range([lenght_bar_1, graph_size.margin.left]);

    const scaleY1 = d3
    .scaleBand()
    .domain(d3.range(data_set_graph1.length))
    .range([graph_size.margin.top, height_bar_1])
    .padding(0.3);

    owo = 0;
    uwu = 0;
    svg_1
      .selectAll("g")
      .data(series_graph1)
      .enter()
        .append("g")
        .attr("fill", (d) => scale_color_graph1(d.key))
        .selectAll("rect")
        .data((d) => d)
        .enter()
          .append("rect")
          .attr("x", (d) => scaleX_graph1(d[1]))
          .attr("y", (d, i) => {return scaleY1(i)})
          .attr("height", scaleY.bandwidth())
          .attr("width", (d, i) => scaleX_graph1(d[0]) - scaleX_graph1(d[1]))
          .attr("class", (d, i) => {if(owo === 3){uwu++; owo=0};owo++;return "stack-bar-" + uwu + " zone-" + owo})
          .on("mouseover", (event, data) => {
            d3.select("#tooltip")
                .html(tooltip_filler([event, data], "line_chart_1"))
                .style("visibility", "visible");
            })
          .on("mousemove", (event, _) => {
            d3.select("#tooltip")
              .style("top", (event.pageY-20)+"px")
              .style("left",(event.pageX+20)+"px")
            })
          .on("mouseout", () => {
            d3.select("#tooltip")
                .style("visibility", "hidden");
            })
}


function instance_ui_objects() {
  // Create buttons
  create_map_buttons()
}

function title_setter(id_) {
  const id = id_.toString();
  const html = "<pre><toolt_head>region, province<br></toolt_head><toolt_title>name</toolt_title><br><toolt_data>Poblacion:&#09 pop<br></toolt_data></pre>"
    .replace("region", data_base[id].ids.region[0] + data_base[id].ids.region.slice(1).toLowerCase())
    .replace("province", data_base[id].ids.province[0] + data_base[id].ids.province.slice(1).toLowerCase())
    .replace("name", data_base[id].ids.commune[0] + data_base[id].ids.commune.slice(1).toLowerCase())
    .replace("pop", data_base[id].data.demography.total)
  return html;
}

function instance_data(path, attribute_map, attribute_top, attribute_bottom, graph_visualizer) {
  const data_setter = (data) => {
    const object_data = new Object();
    data.forEach(element => {object_data[element.ids.id] = element})
    data_base = object_data;
    map_colormap = color_map_scale(attribute_map);
    console.log(data_base)
    instance_graphs(attribute_pie, attribute_top, attribute_bottom, graph_visualizer)
  };
  load_data_csv(path, parser_csv, data_setter, null);
}

let map_colormap = null,
    data_base = null;
    zoom_map = null;
const attribute_map = "total",
      attribute_pie = ["demography", ["males", "females"]],
      attribute_top_ = ["demography", ["depend", "dep_ju", "dep_ve"]];
      attribute_bottom_ = ["housing", ["total", "colective", "particular"]]
instance_data(comunas_data, attribute_map, attribute_top_, attribute_bottom_, graph_visualizer);
instance_map(comunas_geoJSON, map_visualizer, attribute_map);


instance_ui_objects()