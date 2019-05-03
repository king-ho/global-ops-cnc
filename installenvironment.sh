# run as sudo
# install docker
yum install -y yum-utils device-mapper-persistent-data lvm2 wget
yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
yum install docker-ce
usermod -aG docker $(whoami)
systemctl enable docker.service
systemctl start docker.service
yum install epel-release
yum install -y python-pip
pip install docker-compose
yum upgrade python*
docker-compose version

# install portainer
docker volume create portainer_data
docker run -d -p 9000:9000 -v /var/run/docker.sock:/var/run/docker.sock -v portainer_data:/data portainer/portainer

# install Gitlab (change hostname as required)
docker run --detach \
  --hostname gitlab-dev.myts.gl3 \
  --publish 443:443 --publish 80:80 --publish 22:22 \
  --name gitlab \
  --restart always \
  --volume /srv/gitlab/config:/etc/gitlab \
  --volume /srv/gitlab/logs:/var/log/gitlab \
  --volume /srv/gitlab/data:/var/opt/gitlab \
  gitlab/gitlab-ce:latest

# install rancher
docker run -d --restart=unless-stopped -p 443:9001 rancher/rancher:latest

# install k3s
wget https://raw.githubusercontent.com/rancher/k3s/master/docker-compose.yml
docker-compose up --scale node=3
kubectl --kubeconfig kubeconfig.yaml get node

cat << EOF
Environment setup complete
Access to the following applications is available on the following ports:

Staging CNC     8443
Gitlab	        443 (web-interface) 23 (ssh)
Rancher	        9001
k3s             cli
Portainer		    9000
Centos 7(host)  22

Report bugs to: global-it-operation@greenpeace.org
Documentation can be found here: gitlab-dev.myts.gl3/readthe/docs
EOF
