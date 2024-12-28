// Initialisation de la carte
var map = L.map('map');
var osmUrl = 'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
var osmAttrib = 'Map data © OpenStreetMap contributors';
var osm = new L.TileLayer(osmUrl, { attribution: osmAttrib }).addTo(map);
map.setView([45.75, 4.85], 11); // Zoom sur le Grand Lyon


/* fonction pour option n°6 : création de boites d'informations pas seulement sur l'entité polygonale mais aussi sur la donnée ponctuelle */

function addInfoToBox(content, title) {
    var infoBox = document.getElementById("infoBox");
    var titleElement = document.createElement("div");
    titleElement.id = "infoBoxTitle";
    titleElement.textContent = title; // Titre en vert
    
    var contentElement = document.createElement("div");
    contentElement.innerHTML = content;
    
    // Nettoyer le contenu précédent
    infoBox.innerHTML = '';
    infoBox.appendChild(titleElement);
    infoBox.appendChild(contentElement);
}

document.getElementById('closeInfo').addEventListener('click', function() {
    document.getElementById('infoBox').style.display = 'none'; // Cacher la box
});



/* récupération d'une donnée ponctuelle : sites de pluviométrie grace à fetch()  */
/* Définition de l'icône goutte bleue pour la donnée ponctuelle */ 

var goutteIcon = L.icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/5611/5611083.png', // Exemple d'URL d'image
    iconSize: [20, 30], // Taille de l'icône, possibilité ici de la faire varier selon le zoom mais pas réussi
    iconAnchor: [10, 30], // Point d'ancrage (bas-centre de l'image) correspond au centre géographique, optionnel mais très utile; meilleure précision de l'icone 
    popupAnchor: [0, -30] // Position du popup par rapport à l'icône plus au moins au centre et plus ou moins éloigné
});

/* option n°5 qui consiste au survol de la donnée un changement, ici la taille est agrandie au survol */ 
/* création d'une deuxième variable similaire à la première mais avec une taille plus grande et ajustement des popup et ancrage */ 
var goutteIconLarge = L.icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/5611/5611083.png',
    iconSize: [30, 45], // Taille agrandie
    iconAnchor: [15, 45], 
    popupAnchor: [0, -45] 
});

var sitesPluieLayer = L.layerGroup();


fetch('https://data.grandlyon.com/geoserver/metropole-de-lyon/ows?SERVICE=WFS&VERSION=2.0.0&request=GetFeature&typename=metropole-de-lyon:sites-de-pluviometrie&outputFormat=application/json&SRSNAME=EPSG:4171&sortBy=gid')
    .then(response => {
        if (!response.ok) {
            throw new Error('HTTP error! Status: ${response.status}');
        }
        return response.json();
    })
    .then(data => {
        L.geoJson(data, {
            pointToLayer: function (feature, latlng) {
                return L.marker(latlng, { icon: goutteIcon });
            },
            onEachFeature: function (feature, layer) {
                var bufferCircle; // Variable pour gérer le cercle temporaire

                // Gestion des événements sur chaque point
                layer.on({
                    mouseover: function () {
                        // Ajouter une zone tampon de 300m autour du point
                        bufferCircle = L.circle(layer.getLatLng(), {
                            radius: 600, // Rayon de 300 mètres
                            color: '#1E90FF', // Couleur du contour (bleu)
                            weight: 2, // Épaisseur du contour
                            fillColor: '#ADD8E6', // Couleur de remplissage (bleu clair)
                            fillOpacity: 0.3 // Opacité faible du remplissage
                        }).addTo(sitesPluieLayer);

                        // Agrandir temporairement le marqueur
                        layer.setIcon(L.icon({
                            iconUrl: 'https://cdn-icons-png.flaticon.com/512/5611/5611083.png',
                            iconSize: [30, 45], // Taille agrandie
                            iconAnchor: [15, 45],
                            popupAnchor: [0, -45]
                        }));
                    },
                    mouseout: function () {
                        // Supprimer la zone tampon
                        if (bufferCircle) {
                            sitesPluieLayer.removeLayer(bufferCircle);
                        }

                        // Réduire le marqueur à sa taille normale
                        layer.setIcon(goutteIcon);
                    },
                    click: function () {
                        // Mise à jour de la boîte d'information
                        var title = "Sites de Pluviométrie";
                        var content = "Les sites de pluviométrie jouent un rôle essentiel dans l'étude de la perméabilisation des sols, car ils fournissent des données précises sur les précipitations, qui influencent directement le comportement de l'eau dans le sol. En analysant la quantité, la fréquence et la répartition des précipitations, il est possible de mieux comprendre comment l'eau pénètre, s'écoule et interagit avec les différentes couches de sol. Ces informations aident à évaluer la capacité d'infiltration et de drainage des sols, éléments cruciaux pour déterminer leur perméabilité. L'intégration de données pluviométriques dans les modèles d'étude permet ainsi d'optimiser la gestion de l'eau et de prévenir des phénomènes comme le ruissellement ou l'érosion, souvent exacerbés par la saturation des sols imperméabilisés.";

                        addInfoToBox(content, title);

                        var infoBox = document.getElementById('infoBox');
                        infoBox.style.display = 'block';

                        // Affichage du popup avec des informations supplémentaires
                        var popupContent = `<strong>Nom du site :</strong> ${feature.properties.nom}<br>
                        <strong>Type :</strong> ${feature.properties.type}<br>
                        <strong>Altitude :</strong> ${feature.properties.zsol}`;
                        layer.bindPopup(popupContent).openPopup();
                    }
                });
            }
        }).addTo(sitesPluieLayer);
    })
    .catch(error => {
        console.error('Erreur lors du chargement des données GeoJSON :', error);
    });




    
/* récupération d'une donnée polygonale : occupation du sol CLC */
// Fonction pour déterminer la couleur en fonction de la nomenclature

var CLCLayer = L.layerGroup();

function getColor(remark) {
    return remark === "Tissu urbain continu" ? '#E6004D' :
        remark === "Tissu urbain discontinu" ? '#FF0000' :
        remark === "Zones industrielles et commerciales" ? '#CC4DF2' :
        remark === "Réseaux routier et ferroviaire et espaces associés" ? '#CC0000' :
        remark === "Zones portuaires" ? '#E6CCCC' :
        remark === "Aéroports" ? '#E6CCE6' :
        remark === "Espaces verts urbains" ? '#33CC33' :
        remark === "Équipements sportifs et de loisirs" ? '#99FF99' :
        remark === "Extraction de matériaux" ? '#B2B2B2' : // Ajouté
        remark === "Systèmes culturaux et parcellaires complexes" ? '#FFD966' : // Ajouté
        remark === "Surfaces essentiellement agricoles, interrompues par des espaces naturels importants" ? '#FFE699' : // Ajouté
        remark === "Vergers et petits fruits" ? '#FFB266' : // Ajouté
        remark === "Prairies" ? '#99FF33' : // Ajouté
        remark === "Chantiers" ? '#D9D9D9' :
        remark === "Forêts de feuillus" ? '#80FF00' :
        remark === "Landes et broussailles" ? '#A6FF80' :
        remark === "Forêt et végétation arbustive en mutation" ? '#A6F200' :
        remark === "Cours et voies d'eau" ? '#00CCF2' :
        remark === "Plans d'eau" ? '#80F2E6' :
        '#FFEDA0';
}

// Fonction de style
function style(feature) {
    return {
        fillColor: getColor(feature.properties.remark),
        weight: 1,
        opacity: 0.3,
        color: 'white',
        dashArray: '3',
        fillOpacity: 0.7
    };
}

// Fonction pour ajouter des événements sur chaque polygone
// Fonction onEachFeature pour ajouter les événements aux polygones
function onEachFeature(feature, layer) {
    layer.on({
        mouseover: function () {
            layer.setStyle({ weight: 3, color: 'grey', dashArray: '' });
        },
        mouseout: function () {
            layer.setStyle({ weight: 1, color: 'white', dashArray: '3' });
        },
        click: function () {
            // Mettre à jour la boîte d'information si la propriété "remark" existe
            if (feature.properties.remark) {
                var title = "Corine Land Cover (CLC) - Type de Revêtement";
                var content = `La base de données Corine Land Cover (CLC) est un outil précieux pour l'étude des revêtements de sol, car elle offre une cartographie détaillée des différentes classes d'occupation du sol à l'échelle européenne. En analysant ces données, il est possible d'identifier les types de revêtements, tels que les zones urbaines, agricoles, forestières ou les surfaces artificialisées, qui influencent la perméabilité des sols. Les zones urbaines et les surfaces artificielles, par exemple, sont souvent associées à une imperméabilisation accrue, réduisant l'infiltration de l'eau et favorisant le ruissellement. L'utilisation des données CLC permet ainsi d'évaluer l'impact des différents types de revêtements sur les processus hydrologiques et d'informer les politiques d'aménagement du territoire visant à préserver ou restaurer la perméabilité des sols.`;

                // Mettre à jour et afficher la boîte d'information
                addInfoToBox(content, title);
                var infoBox = document.getElementById('infoBox');
                infoBox.style.display = 'block';
            }

            // Toujours afficher un popup pour le polygone
            layer.bindPopup("Nomenclature CLC: " + feature.properties.remark).openPopup();
        }
    });
}

// Appliquer les événements sur les couches GeoJSON
L.geoJson(CLC, {
    style: style,
    onEachFeature: onEachFeature
}).addTo(CLCLayer);



/* récupération d'une donnée linéaire : pistes cyclables */
var pistesCyclablesLayer = L.layerGroup();

fetch('https://data.grandlyon.com/geoserver/metropole-de-lyon/ows?SERVICE=WFS&VERSION=2.0.0&request=GetFeature&typename=metropole-de-lyon:pvo_patrimoine_voirie.pvoamenagementcyclable&outputFormat=application/json&SRSNAME=EPSG:4171&sortBy=gid')
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        // Ajouter les pistes cyclables à la carte
        L.geoJson(data, {
            style: function () {
                return {
                    color: '#878787', // Couleur grise
                    weight: 1,        // Épaisseur de la ligne
                    opacity: 0.8,     // Opacité de la ligne
                    dashArray: '5,5'  // Pointillés : 5px de ligne, 5px d'espace
                };
            },
            onEachFeature: function (feature, layer) {
                if (feature.properties) {
                    layer.bindPopup(`<b>Type :</b> ${feature.properties.revetementpiste}`);
                }
            }
        }).addTo(pistesCyclablesLayer);
    })
    .catch(error => {
        console.error('Erreur lors du chargement des données GeoJSON :', error);
    });



// Ajouter directement les calques à la carte au démarrage
sitesPluieLayer.addTo(map);
CLCLayer.addTo(map);
pistesCyclablesLayer.addTo(map);


// Créer le contrôle des calques
var baseMaps = {
    "Sites de Pluviométrie": sitesPluieLayer,
    "Occupation du Sol (CLC)": CLCLayer,
    "Pistes Cyclables": pistesCyclablesLayer
};

// Ajouter un contrôle des calques avec les couches activées par défaut
L.control.layers(null, baseMaps, { collapsed: false }).addTo(map);







// Fonction pour mettre à jour la légende en fonction des calques visibles
function updateLegend() {
    var content = '';
    
    // Vérifier si le calque "Sites de Pluviométrie" est visible
    if (map.hasLayer(sitesPluieLayer)) {
        content += `<img src="https://cdn-icons-png.flaticon.com/512/5611/5611083.png" style="width: 50px; height: 20px; vertical-align: middle; margin-right: 5px; display: inline-block;"> Site de pluviométrie<br>`;
    }

        // Vérifier si le calque "Pistes Cyclables" est visible
        if (map.hasLayer(pistesCyclablesLayer)) {
            content += `<i style="background:${'#878787'}; width: 20px; height: 2px; border: 1px solid #000; border-radius: 1px; display: inline-block;"></i> Pistes cyclables <br><br>`;
        }
    

    // Vérifier si le calque "Occupation du Sol (CLC)" est visible
    if (map.hasLayer(CLCLayer)) {
        content += '<b>Occupation du sol selon Corine Land Cover (CLC)</b><br>';
        var categories = [
            { label: 'Tissu urbain continu', color: '#E6004D' },
            { label: 'Tissu urbain discontinu', color: '#FF0000' },
            { label: 'Zones industrielles et commerciales', color: '#CC4DF2' },
            { label: 'Réseaux routier et ferroviaire et espaces associés', color: '#CC0000' },
            { label: 'Zones portuaires', color: '#E6CCCC' },
            { label: 'Aéroports', color: '#E6CCE6' },
            { label: 'Chantiers', color: '#D9D9D9' },
            { label: 'Extraction de matériaux', color: '#B2B2B2' },
            { label: 'Espaces verts urbains', color: '#33CC33' },
            { label: 'Prairies', color: '#99FF33' },
            { label: 'Landes et broussailles', color: '#A6FF80' },
            { label: 'Forêts de feuillus', color: '#80FF00' },
            { label: 'Vergers et petits fruits', color: '#FFB266' },
            { label: 'Systèmes culturaux et parcellaires complexes', color: '#FFD966' },
            { label: 'Surfaces essentiellement agricoles, interrompues par des espaces naturels importants', color: '#FFE699' },
            { label: 'Forêt et végétation arbustive en mutation', color: '#A6F200' },
            { label: 'Cours et voies d\'eau', color: '#00CCF2' },
            { label: 'Plans d\'eau', color: '#80F2E6' }
        ];
        
        categories.forEach(function (category) {
            content += `<i style="background:${category.color}; width: 10px; height: 10px; border: 1px solid #000; border-radius: 1px; display: inline-block;"></i> ${category.label}<br>`;
        });
    }


    

    // Mettre à jour le contenu de la légende
    document.getElementById("legend-content").innerHTML = content;
}

// Légende
var legend = L.control({ position: 'bottomleft' });

legend.onAdd = function (map) {
    var div = L.DomUtil.create('div', 'info legend');
    div.innerHTML = '<div id="legend-content"></div>'; // Légende vide au début
    return div;
};

legend.addTo(map);

// Initialiser la légende au démarrage pour que les calques par défaut soient pris en compte
updateLegend();

// Observer l'ajout ou la suppression de calques pour mettre à jour la légende
map.on('layeradd layerremove', updateLegend);


/* Echelle à la carte, option n°1 */
L.control.scale({
    position: 'bottomright', /* Position de l'échelle en bas à droite */
    imperial: false,        /* pas en imperial pas nécessaire vue le périmètre d'étude mais intéressant à une échelle */
    metric: true            // je veux en km donc true pour le metric 
}).addTo(map);
