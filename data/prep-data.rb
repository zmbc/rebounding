require 'csv'

data = []

['guards', 'forwards', 'centers'].each do |position|
  ['1982-83', '1994-95', '2016-17'].each do |season|
    csv = CSV.read("./#{position}-#{season}.csv", headers: true).map do |row|
      row['Position'] = position.chomp('s').capitalize
      row
    end
    data += csv
  end
end

data = data.map do |row|
  row['ID'] = row['Player'].split('\\')[1]
  row['Player'] = row['Player'].split('\\')[0]
  row.delete 'Rk'
  row
end

CSV.open('prepped-data.csv', 'w', write_headers: true, headers: data[0].headers) do |csv|
  data.each do |row|
    csv << row
  end
end
